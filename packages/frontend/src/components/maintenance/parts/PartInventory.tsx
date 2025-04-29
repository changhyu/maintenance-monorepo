import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface PartInventoryProps {
  open: boolean;
  onClose: () => void;
  partId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const PartInventory: React.FC<PartInventoryProps> = ({ open, onClose, partId }) => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [orderQuantity, setOrderQuantity] = useState(0);
  const [orderSupplier, setOrderSupplier] = useState('');
  const [usageQuantity, setUsageQuantity] = useState(0);
  const [usageNote, setUsageNote] = useState('');

  // 부품 정보 조회
  const { data: part } = useQuery(
    ['part', partId],
    async () => {
      const response = await fetch(`/api/v1/maintenance/parts/${partId}`);
      if (!response.ok) throw new Error('부품 정보를 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 부품 사용 이력 조회
  const { data: usageHistory } = useQuery(
    ['partUsage', partId],
    async () => {
      const response = await fetch(`/api/v1/maintenance/parts/${partId}/usage`);
      if (!response.ok) throw new Error('사용 이력을 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 부품 발주 이력 조회
  const { data: orderHistory } = useQuery(
    ['partOrders', partId],
    async () => {
      const response = await fetch(`/api/v1/maintenance/parts/${partId}/orders`);
      if (!response.ok) throw new Error('발주 이력을 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 발주 등록
  const orderMutation = useMutation(
    async () => {
      const response = await fetch(`/api/v1/maintenance/parts/${partId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: orderQuantity,
          supplier: orderSupplier,
          orderDate: new Date(),
          status: 'ORDERED',
        }),
      });

      if (!response.ok) throw new Error('발주 등록에 실패했습니다.');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['partOrders', partId]);
        setOrderQuantity(0);
        setOrderSupplier('');
      },
    }
  );

  // 사용 등록
  const usageMutation = useMutation(
    async () => {
      const response = await fetch(`/api/v1/maintenance/parts/${partId}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: usageQuantity,
          note: usageNote,
          date: new Date(),
        }),
      });

      if (!response.ok) throw new Error('사용 등록에 실패했습니다.');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['partUsage', partId]);
        queryClient.invalidateQueries(['part', partId]);
        setUsageQuantity(0);
        setUsageNote('');
      },
    }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOrder = () => {
    if (orderQuantity > 0 && orderSupplier) {
      orderMutation.mutate();
    }
  };

  const handleUsage = () => {
    if (usageQuantity > 0) {
      usageMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>재고 관리 - {part?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="재고 현황" />
            <Tab label="입고/발주" />
            <Tab label="출고/사용" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="subtitle2">현재 재고</Typography>
              <Typography variant="h4">{part?.currentStock}개</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2">최소 재고</Typography>
              <Typography variant="h6">{part?.minStock}개</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2">최대 재고</Typography>
              <Typography variant="h6">{part?.maxStock}개</Typography>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <TextField
                label="발주 수량"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Number(e.target.value))}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">개</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>공급업체</InputLabel>
                <Select
                  value={orderSupplier}
                  label="공급업체"
                  onChange={(e) => setOrderSupplier(e.target.value)}
                >
                  <MenuItem value="supplier1">공급업체 1</MenuItem>
                  <MenuItem value="supplier2">공급업체 2</MenuItem>
                  <MenuItem value="supplier3">공급업체 3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleOrder}
            disabled={orderQuantity <= 0 || !orderSupplier || orderMutation.isLoading}
            fullWidth
          >
            발주 등록
          </Button>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>발주 이력</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>발주일</TableCell>
                  <TableCell>수량</TableCell>
                  <TableCell>공급업체</TableCell>
                  <TableCell>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderHistory?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>{format(new Date(order.orderDate), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{order.quantity}개</TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell>{order.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <TextField
                label="사용 수량"
                type="number"
                value={usageQuantity}
                onChange={(e) => setUsageQuantity(Number(e.target.value))}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">개</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="비고"
                value={usageNote}
                onChange={(e) => setUsageNote(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleUsage}
            disabled={usageQuantity <= 0 || usageMutation.isLoading}
            fullWidth
          >
            사용 등록
          </Button>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>사용 이력</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>사용일</TableCell>
                  <TableCell>수량</TableCell>
                  <TableCell>비고</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usageHistory?.map((usage: any) => (
                  <TableRow key={usage.id}>
                    <TableCell>{format(new Date(usage.date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{usage.quantity}개</TableCell>
                    <TableCell>{usage.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PartInventory; 