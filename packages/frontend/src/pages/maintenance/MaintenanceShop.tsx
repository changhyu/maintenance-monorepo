import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Rating,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MaintenanceService } from '../../services/maintenanceService';

interface MaintenanceShop {
  id: string;
  name: string;
  address: string;
  phone: string;
  businessHours: string;
  specialties: string[];
  rating: number;
  totalMaintenances: number;
  completedMaintenances: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ShopPerformance {
  month: string;
  completedCount: number;
  satisfactionRate: number;
  averageCompletionTime: number;
}

const MaintenanceShop: React.FC = () => {
  const [shops, setShops] = useState<MaintenanceShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<MaintenanceShop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [performanceData, setPerformanceData] = useState<ShopPerformance[]>([]);
  const [newShop, setNewShop] = useState<Partial<MaintenanceShop>>({
    name: '',
    address: '',
    phone: '',
    businessHours: '09:00 - 18:00',
    specialties: [],
    status: 'ACTIVE'
  });

  const maintenanceService = MaintenanceService.getInstance();

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      loadShopPerformance(selectedShop.id);
    }
  }, [selectedShop]);

  const loadShops = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceService.getMaintenanceShops();
      setShops(data);
    } catch (error) {
      console.error('정비소 목록 로딩 실패:', error);
      setError('정비소 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadShopPerformance = async (shopId: string) => {
    try {
      const data = await maintenanceService.getShopPerformance(shopId);
      setPerformanceData(data);
    } catch (error) {
      console.error('정비소 실적 로딩 실패:', error);
    }
  };

  const handleOpenDialog = (shop?: MaintenanceShop) => {
    if (shop) {
      setSelectedShop(shop);
      setNewShop(shop);
    } else {
      setSelectedShop(null);
      setNewShop({
        name: '',
        address: '',
        phone: '',
        businessHours: '09:00 - 18:00',
        specialties: [],
        status: 'ACTIVE'
      });
    }
    setDialogOpen(true);
  };

  const handleSaveShop = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedShop) {
        await maintenanceService.updateMaintenanceShop(selectedShop.id, {
          name: newShop.name,
          address: newShop.address,
          phone: newShop.phone,
          operatingHours: {
            open: newShop.businessHours?.split(' - ')[0] || '09:00',
            close: newShop.businessHours?.split(' - ')[1] || '18:00'
          },
          specialties: newShop.specialties,
          isPartner: newShop.status === 'ACTIVE'
        });
      } else {
        await maintenanceService.createMaintenanceShop({
          name: newShop.name || '',
          address: newShop.address || '',
          phone: newShop.phone || '',
          operatingHours: {
            open: newShop.businessHours?.split(' - ')[0] || '09:00',
            close: newShop.businessHours?.split(' - ')[1] || '18:00'
          },
          specialties: newShop.specialties || [],
          isPartner: newShop.status === 'ACTIVE'
        });
      }
      
      await loadShops();
      setDialogOpen(false);
    } catch (error) {
      console.error('정비소 저장 실패:', error);
      setError('정비소 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async () => {
    if (!selectedShop) return;

    try {
      setLoading(true);
      setError(null);
      await maintenanceService.deleteMaintenanceShop(selectedShop.id);
      await loadShops();
      setDeleteDialogOpen(false);
      setSelectedShop(null);
    } catch (error) {
      console.error('정비소 삭제 실패:', error);
      setError('정비소 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewShop(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const renderShopList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>정비소명</TableCell>
            <TableCell>주소</TableCell>
            <TableCell>연락처</TableCell>
            <TableCell align="center">평점</TableCell>
            <TableCell align="center">완료된 정비</TableCell>
            <TableCell align="center">상태</TableCell>
            <TableCell align="right">작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shops.map((shop) => (
            <TableRow
              key={shop.id}
              hover
              onClick={() => setSelectedShop(shop)}
              selected={selectedShop?.id === shop.id}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography variant="subtitle2">{shop.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {shop.specialties.join(', ')}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon fontSize="small" color="action" />
                  {shop.address}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  {shop.phone}
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Rating value={shop.rating} readOnly size="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    ({shop.rating.toFixed(1)})
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                {shop.completedMaintenances}/{shop.totalMaintenances}
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={shop.status === 'ACTIVE' ? '운영중' : '휴업중'}
                  color={shop.status === 'ACTIVE' ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(shop);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShop(shop);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderShopDetails = () => {
    if (!selectedShop) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            정비소를 선택하여 상세 정보를 확인하세요.
          </Typography>
        </Paper>
      );
    }

    return (
      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedShop.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationIcon color="action" />
                  <Typography>{selectedShop.address}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PhoneIcon color="action" />
                  <Typography>{selectedShop.phone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon color="action" />
                  <Typography>{selectedShop.businessHours}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  전문 분야
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedShop.specialties.map((specialty) => (
                    <Chip key={specialty} label={specialty} size="small" />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="실적 현황" />
              <Tab label="만족도 추이" />
              <Tab label="처리 시간" />
            </Tabs>
          </Box>

          <Box sx={{ height: 300 }}>
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {tabValue === 0 ? (
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completedCount" name="완료된 정비" fill="#8884d8" />
                  </BarChart>
                ) : tabValue === 1 ? (
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="satisfactionRate" name="만족도" fill="#82ca9d" />
                  </BarChart>
                ) : (
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="averageCompletionTime"
                      name="평균 처리 시간 (시간)"
                      fill="#ffc658"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">
                  정비소 실적 데이터가 없습니다.
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">정비소 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          정비소 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                정비소 목록
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : shops.length > 0 ? (
                renderShopList()
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    등록된 정비소가 없습니다.
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    sx={{ mt: 1 }}
                    onClick={() => handleOpenDialog()}
                  >
                    새 정비소 등록하기
                  </Button>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          {renderShopDetails()}
        </Grid>
      </Grid>

      {/* 정비소 등록/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedShop ? '정비소 정보 수정' : '새 정비소 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="정비소명"
                  name="name"
                  value={newShop?.name || ''}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="주소"
                  name="address"
                  value={newShop?.address || ''}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="연락처"
                  name="phone"
                  value={newShop?.phone || ''}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="영업시간"
                  name="businessHours"
                  value={newShop?.businessHours || ''}
                  onChange={handleChange}
                  placeholder="09:00 - 18:00"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={newShop?.status || 'ACTIVE'}
                    label="상태"
                    onChange={handleChange as any}
                  >
                    <MenuItem value="ACTIVE">운영중</MenuItem>
                    <MenuItem value="INACTIVE">휴업중</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSaveShop}
            disabled={loading || !newShop?.name || !newShop?.address || !newShop?.phone}
          >
            {loading ? <CircularProgress size={24} /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>정비소 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedShop?.name}을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteShop} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceShop;