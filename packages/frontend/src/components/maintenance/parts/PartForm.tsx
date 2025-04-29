import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PartFormData {
  name: string;
  partNumber: string;
  category: string;
  manufacturer: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  price: number;
  status: string;
}

interface PartFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<PartFormData>;
  mode: 'create' | 'edit';
}

const PartForm: React.FC<PartFormProps> = ({ open, onClose, initialData, mode }) => {
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<PartFormData>({
    defaultValues: {
      name: '',
      partNumber: '',
      category: '',
      manufacturer: '',
      description: '',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      price: 0,
      status: 'ACTIVE',
      ...initialData,
    },
  });

  const mutation = useMutation(
    async (data: PartFormData) => {
      const url = mode === 'create' 
        ? '/api/v1/maintenance/parts'
        : `/api/v1/maintenance/parts/${initialData?.id}`;
      
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('부품 저장에 실패했습니다.');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['parts']);
        onClose();
        reset();
      },
    }
  );

  const onSubmit = (data: PartFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '부품 등록' : '부품 수정'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller
                name="name"
                control={control}
                rules={{ required: '부품명은 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="부품명"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="partNumber"
                control={control}
                rules={{ required: '부품번호는 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="부품번호"
                    fullWidth
                    error={!!errors.partNumber}
                    helperText={errors.partNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="category"
                control={control}
                rules={{ required: '카테고리는 필수입니다.' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>카테고리</InputLabel>
                    <Select {...field} label="카테고리">
                      <MenuItem value="ENGINE">엔진</MenuItem>
                      <MenuItem value="TRANSMISSION">변속기</MenuItem>
                      <MenuItem value="BRAKE">브레이크</MenuItem>
                      <MenuItem value="SUSPENSION">서스펜션</MenuItem>
                      <MenuItem value="ELECTRICAL">전기</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="manufacturer"
                control={control}
                rules={{ required: '제조사는 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="제조사"
                    fullWidth
                    error={!!errors.manufacturer}
                    helperText={errors.manufacturer?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="설명"
                    fullWidth
                    multiline
                    rows={3}
                  />
                )}
              />
            </Grid>
            <Grid item xs={4}>
              <Controller
                name="currentStock"
                control={control}
                rules={{ 
                  required: '현재고는 필수입니다.',
                  min: { value: 0, message: '현재고는 0 이상이어야 합니다.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="현재고"
                    fullWidth
                    error={!!errors.currentStock}
                    helperText={errors.currentStock?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">개</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={4}>
              <Controller
                name="minStock"
                control={control}
                rules={{ 
                  required: '최소재고는 필수입니다.',
                  min: { value: 0, message: '최소재고는 0 이상이어야 합니다.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="최소재고"
                    fullWidth
                    error={!!errors.minStock}
                    helperText={errors.minStock?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">개</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={4}>
              <Controller
                name="maxStock"
                control={control}
                rules={{ 
                  required: '최대재고는 필수입니다.',
                  min: { value: 0, message: '최대재고는 0 이상이어야 합니다.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="최대재고"
                    fullWidth
                    error={!!errors.maxStock}
                    helperText={errors.maxStock?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">개</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="price"
                control={control}
                rules={{ 
                  required: '가격은 필수입니다.',
                  min: { value: 0, message: '가격은 0 이상이어야 합니다.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="가격"
                    fullWidth
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">원</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="status"
                control={control}
                rules={{ required: '상태는 필수입니다.' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel>상태</InputLabel>
                    <Select {...field} label="상태">
                      <MenuItem value="ACTIVE">사용</MenuItem>
                      <MenuItem value="INACTIVE">미사용</MenuItem>
                      <MenuItem value="DISCONTINUED">단종</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>취소</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={mutation.isLoading}
          >
            {mode === 'create' ? '등록' : '수정'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PartForm; 