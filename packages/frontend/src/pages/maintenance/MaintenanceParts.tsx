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
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  ShoppingCart as OrderIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MaintenanceService } from '../../services/maintenanceService';

interface MaintenancePart {
  id: string;
  name: string;
  partNumber: string;
  manufacturer: string;
  category: string;
  description: string;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  location: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ORDERED';
  lastOrderDate?: string;
  lastReceivedDate?: string;
}

interface PartUsageHistory {
  id: string;
  partId: string;
  maintenanceId: string;
  quantity: number;
  usageDate: string;
  vehicleId: string;
  technicianId: string;
}

interface PartOrder {
  id: string;
  partId: string;
  quantity: number;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  supplierName: string;
  totalPrice: number;
}

const MaintenanceParts: React.FC = () => {
  const [parts, setParts] = useState<MaintenancePart[]>([]);
  const [selectedPart, setSelectedPart] = useState<MaintenancePart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usageHistory, setUsageHistory] = useState<PartUsageHistory[]>([]);
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [orderQuantity, setOrderQuantity] = useState(0);

  const maintenanceService = MaintenanceService.getInstance();

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    if (selectedPart) {
      loadPartDetails(selectedPart.id);
    }
  }, [selectedPart]);

  const loadParts = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.getMaintenanceParts();
      setParts(data);
    } catch (error) {
      console.error('부품 목록 로딩 실패:', error);
      setError('부품 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPartDetails = async (partId: string) => {
    try {
      const [usageData, orderData] = await Promise.all([
        maintenanceService.getPartUsageHistory(partId),
        maintenanceService.getPartOrders(partId),
      ]);
      setUsageHistory(usageData);
      setOrders(orderData);
    } catch (error) {
      console.error('부품 상세 정보 로딩 실패:', error);
    }
  };

  const handleSavePart = async (part: MaintenancePart) => {
    try {
      setLoading(true);
      if (part.id) {
        await maintenanceService.updateMaintenancePart(part.id, part);
      } else {
        await maintenanceService.createMaintenancePart(part);
      }
      await loadParts();
      setDialogOpen(false);
    } catch (error) {
      console.error('부품 저장 실패:', error);
      setError('부품 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePart = async () => {
    if (!selectedPart) return;

    try {
      setLoading(true);
      await maintenanceService.deleteMaintenancePart(selectedPart.id);
      await loadParts();
      setDeleteDialogOpen(false);
      setSelectedPart(null);
    } catch (error) {
      console.error('부품 삭제 실패:', error);
      setError('부품 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderPart = async () => {
    if (!selectedPart || orderQuantity <= 0) return;

    try {
      setLoading(true);
      await maintenanceService.createPartOrder({
        partId: selectedPart.id,
        quantity: orderQuantity,
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      await loadPartDetails(selectedPart.id);
      setOrderDialogOpen(false);
      setOrderQuantity(0);
    } catch (error) {
      console.error('부품 발주 실패:', error);
      setError('부품 발주에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'success';
      case 'LOW_STOCK':
        return 'warning';
      case 'OUT_OF_STOCK':
        return 'error';
      case 'ORDERED':
        return 'info';
      default:
        return 'default';
    }
  };

  const renderPartList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>부품명</TableCell>
            <TableCell>부품 번호</TableCell>
            <TableCell>제조사</TableCell>
            <TableCell align="right">재고</TableCell>
            <TableCell align="right">단가</TableCell>
            <TableCell align="center">상태</TableCell>
            <TableCell align="right">작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parts.map((part) => (
            <TableRow
              key={part.id}
              hover
              onClick={() => setSelectedPart(part)}
              selected={selectedPart?.id === part.id}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography variant="subtitle2">{part.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {part.category}
                </Typography>
              </TableCell>
              <TableCell>{part.partNumber}</TableCell>
              <TableCell>{part.manufacturer}</TableCell>
              <TableCell align="right">
                {part.stockQuantity}
                {part.stockQuantity <= part.minStockLevel && (
                  <WarningIcon
                    color="warning"
                    fontSize="small"
                    sx={{ ml: 1, verticalAlign: 'middle' }}
                  />
                )}
              </TableCell>
              <TableCell align="right">
                {part.unitPrice.toLocaleString()}원
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={
                    part.status === 'IN_STOCK'
                      ? '재고 있음'
                      : part.status === 'LOW_STOCK'
                      ? '재고 부족'
                      : part.status === 'OUT_OF_STOCK'
                      ? '재고 없음'
                      : '주문됨'
                  }
                  color={getStockStatusColor(part.status)}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPart(part);
                    setDialogOpen(true);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPart(part);
                    setOrderDialogOpen(true);
                  }}
                >
                  <OrderIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPart(part);
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

  const renderPartDetails = () => {
    if (!selectedPart) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            부품을 선택하여 상세 정보를 확인하세요.
          </Typography>
        </Paper>
      );
    }

    return (
      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedPart.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  기본 정보
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    부품 번호
                  </Typography>
                  <Typography>{selectedPart.partNumber}</Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    제조사
                  </Typography>
                  <Typography>{selectedPart.manufacturer}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    카테고리
                  </Typography>
                  <Typography>{selectedPart.category}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  재고 정보
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    현재 재고
                  </Typography>
                  <Typography>{selectedPart.stockQuantity}개</Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    최소/최대 재고
                  </Typography>
                  <Typography>
                    {selectedPart.minStockLevel} / {selectedPart.maxStockLevel}개
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    보관 위치
                  </Typography>
                  <Typography>{selectedPart.location}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="사용 이력" />
              <Tab label="발주 이력" />
              <Tab label="재고 추이" />
            </Tabs>
          </Box>

          {tabValue === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>날짜</TableCell>
                    <TableCell>차량</TableCell>
                    <TableCell>정비사</TableCell>
                    <TableCell align="right">수량</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>
                        {new Date(history.usageDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{history.vehicleId}</TableCell>
                      <TableCell>{history.technicianId}</TableCell>
                      <TableCell align="right">{history.quantity}개</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 1 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>주문일</TableCell>
                    <TableCell>예상 입고일</TableCell>
                    <TableCell>공급업체</TableCell>
                    <TableCell align="right">수량</TableCell>
                    <TableCell align="right">금액</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell align="right">{order.quantity}개</TableCell>
                      <TableCell align="right">
                        {order.totalPrice.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            order.status === 'PENDING'
                              ? '대기'
                              : order.status === 'CONFIRMED'
                              ? '확인'
                              : order.status === 'SHIPPED'
                              ? '배송중'
                              : order.status === 'DELIVERED'
                              ? '입고완료'
                              : '취소'
                          }
                          color={
                            order.status === 'DELIVERED'
                              ? 'success'
                              : order.status === 'CANCELLED'
                              ? 'error'
                              : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 2 && (
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="usageDate"
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    name="사용량"
                    stroke="#8884d8"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">부품 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedPart(null);
            setDialogOpen(true);
          }}
        >
          부품 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">부품 목록</Typography>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={loadParts}
                  disabled={loading}
                >
                  새로고침
                </Button>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderPartList()
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          {renderPartDetails()}
        </Grid>
      </Grid>

      {/* 부품 등록/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedPart ? '부품 정보 수정' : '새 부품 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="부품명"
                  value={selectedPart?.name || ''}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      name: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="부품 번호"
                  value={selectedPart?.partNumber || ''}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      partNumber: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="제조사"
                  value={selectedPart?.manufacturer || ''}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      manufacturer: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="카테고리"
                  value={selectedPart?.category || ''}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      category: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="설명"
                  value={selectedPart?.description || ''}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      description: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="현재 재고"
                  value={selectedPart?.stockQuantity || 0}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      stockQuantity: Number(e.target.value),
                    }))
                  }
                  InputProps={{
                    endAdornment: <InputAdornment position="end">개</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="단가"
                  value={selectedPart?.unitPrice || 0}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      unitPrice: Number(e.target.value),
                    }))
                  }
                  InputProps={{
                    endAdornment: <InputAdornment position="end">원</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="최소 재고"
                  value={selectedPart?.minStockLevel || 0}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      minStockLevel: Number(e.target.value),
                    }))
                  }
                  InputProps={{
                    endAdornment: <InputAdornment position="end">개</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="최대 재고"
                  value={selectedPart?.maxStockLevel || 0}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      maxStockLevel: Number(e.target.value),
                    }))
                  }
                  InputProps={{
                    endAdornment: <InputAdornment position="end">개</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="보관 위치"
                  value={selectedPart?.location || ''}
                  onChange={(e) =>
                    setSelectedPart(prev => ({
                      ...prev!,
                      location: e.target.value,
                    }))
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={() => selectedPart && handleSavePart(selectedPart)}
            disabled={loading}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 발주 다이얼로그 */}
      <Dialog
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
      >
        <DialogTitle>부품 발주</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography gutterBottom>
              {selectedPart?.name} (현재 재고: {selectedPart?.stockQuantity}개)
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="발주 수량"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">개</InputAdornment>,
              }}
              sx={{ mt: 2 }}
            />
            {selectedPart && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                예상 금액: {(orderQuantity * selectedPart.unitPrice).toLocaleString()}원
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleOrderPart}
            disabled={loading || orderQuantity <= 0}
          >
            발주
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>부품 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedPart?.name}을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeletePart} color="error" disabled={loading}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceParts; 