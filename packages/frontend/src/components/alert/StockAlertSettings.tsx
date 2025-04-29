import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Typography,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface AlertSetting {
  id: string;
  partId: string;
  part: {
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
  };
  type: 'LOW_STOCK' | 'HIGH_STOCK' | 'STOCK_OUT';
  threshold: number;
  notificationChannels: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

interface AlertFormData {
  partId: string;
  type: 'LOW_STOCK' | 'HIGH_STOCK' | 'STOCK_OUT';
  threshold: number;
  notificationChannels: string[];
}

const StockAlertSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertSetting | null>(null);

  // 알림 설정 목록 조회
  const { data: settings, isLoading } = useQuery(
    ['alertSettings'],
    async () => {
      const response = await fetch('/api/v1/maintenance/alerts/settings');
      if (!response.ok) throw new Error('알림 설정을 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 부품 목록 조회 (알림 설정 시 선택용)
  const { data: parts } = useQuery(
    ['parts'],
    async () => {
      const response = await fetch('/api/v1/maintenance/parts');
      if (!response.ok) throw new Error('부품 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 알림 설정 생성
  const createMutation = useMutation(
    async (data: AlertFormData) => {
      const response = await fetch('/api/v1/maintenance/alerts/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('알림 설정 생성에 실패했습니다.');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alertSettings']);
        setOpenForm(false);
      },
    }
  );

  // 알림 설정 수정
  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: Partial<AlertFormData> }) => {
      const response = await fetch(`/api/v1/maintenance/alerts/settings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('알림 설정 수정에 실패했습니다.');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alertSettings']);
        setOpenForm(false);
        setEditingAlert(null);
      },
    }
  );

  // 알림 설정 삭제
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await fetch(`/api/v1/maintenance/alerts/settings/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('알림 설정 삭제에 실패했습니다.');
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alertSettings']);
      },
    }
  );

  // 알림 상태 토글
  const toggleMutation = useMutation(
    async (id: string) => {
      const response = await fetch(`/api/v1/maintenance/alerts/settings/${id}/toggle`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('알림 상태 변경에 실패했습니다.');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alertSettings']);
      },
    }
  );

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return '재고 부족';
      case 'HIGH_STOCK':
        return '과다 재고';
      case 'STOCK_OUT':
        return '재고 소진';
      default:
        return type;
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'warning';
      case 'HIGH_STOCK':
        return 'info';
      case 'STOCK_OUT':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          재고 알림 설정
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenForm(true)}
        >
          알림 설정 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>부품</TableCell>
              <TableCell>알림 유형</TableCell>
              <TableCell align="right">임계값</TableCell>
              <TableCell>알림 채널</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings?.map((setting: AlertSetting) => (
              <TableRow key={setting.id}>
                <TableCell>
                  <Typography>{setting.part.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    현재 재고: {setting.part.currentStock}개
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getAlertTypeText(setting.type)}
                    color={getAlertTypeColor(setting.type)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{setting.threshold}개</TableCell>
                <TableCell>
                  {setting.notificationChannels.map((channel) => (
                    <Chip
                      key={channel}
                      label={channel === 'EMAIL' ? '이메일' : '푸시 알림'}
                      size="small"
                      sx={{ mr: 0.5 }}
                    />
                  ))}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={setting.status === 'ACTIVE'}
                    onChange={() => toggleMutation.mutate(setting.id)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingAlert(setting);
                        setOpenForm(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (window.confirm('이 알림 설정을 삭제하시겠습니까?')) {
                          deleteMutation.mutate(setting.id);
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 알림 설정 폼 */}
      <Dialog open={openForm} onClose={() => {
        setOpenForm(false);
        setEditingAlert(null);
      }}>
        <DialogTitle>
          {editingAlert ? '알림 설정 수정' : '알림 설정 추가'}
        </DialogTitle>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget as HTMLFormElement);
          const data = {
            partId: formData.get('partId') as string,
            type: formData.get('type') as AlertFormData['type'],
            threshold: Number(formData.get('threshold')),
            notificationChannels: [
              ...(formData.get('email') === 'on' ? ['EMAIL'] : []),
              ...(formData.get('push') === 'on' ? ['PUSH'] : []),
            ],
          };

          if (editingAlert) {
            updateMutation.mutate({ id: editingAlert.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>부품</InputLabel>
                <Select
                  name="partId"
                  label="부품"
                  defaultValue={editingAlert?.partId || ''}
                >
                  {parts?.items.map((part: any) => (
                    <MenuItem key={part.id} value={part.id}>
                      {part.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>알림 유형</InputLabel>
                <Select
                  name="type"
                  label="알림 유형"
                  defaultValue={editingAlert?.type || 'LOW_STOCK'}
                >
                  <MenuItem value="LOW_STOCK">재고 부족</MenuItem>
                  <MenuItem value="HIGH_STOCK">과다 재고</MenuItem>
                  <MenuItem value="STOCK_OUT">재고 소진</MenuItem>
                </Select>
              </FormControl>

              <TextField
                name="threshold"
                label="임계값"
                type="number"
                defaultValue={editingAlert?.threshold || 0}
                fullWidth
              />

              <FormGroup>
                <Typography variant="subtitle2" gutterBottom>
                  알림 채널
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="email"
                      defaultChecked={editingAlert?.notificationChannels.includes('EMAIL')}
                    />
                  }
                  label="이메일"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="push"
                      defaultChecked={editingAlert?.notificationChannels.includes('PUSH')}
                    />
                  }
                  label="푸시 알림"
                />
              </FormGroup>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenForm(false);
              setEditingAlert(null);
            }}>
              취소
            </Button>
            <Button type="submit" variant="contained">
              {editingAlert ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default StockAlertSettings; 