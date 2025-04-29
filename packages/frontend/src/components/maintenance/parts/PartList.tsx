import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Part, PartStatus, PartCategory } from '../../../types/part';
import PartService from '../../../services/PartService';

const partService = PartService.getInstance();

const PartList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<PartCategory | ''>('');
  const [manufacturer, setManufacturer] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery(
    ['parts', page, rowsPerPage, searchTerm, category, manufacturer, sortBy, sortOrder],
    () => partService.getParts({
      page,
      limit: rowsPerPage,
      search: searchTerm,
      category: category || undefined,
      manufacturer: manufacturer || undefined,
      sortBy,
      sortOrder
    })
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partService.deletePart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    }
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStockStatusColor = (currentStock: number, minStock: number) => {
    if (currentStock <= minStock) return 'error';
    if (currentStock <= minStock * 1.2) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          부품 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* TODO: 부품 등록 모달 열기 */}}
        >
          부품 등록
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          label="검색"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 200 }}
        />
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>카테고리</InputLabel>
          <Select
            value={category}
            label="카테고리"
            onChange={(e) => setCategory(e.target.value as PartCategory)}
          >
            <MenuItem value="">전체</MenuItem>
            {Object.entries(PartCategory).map(([key, value]) => (
              <MenuItem key={key} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>제조사</InputLabel>
          <Select
            value={manufacturer}
            label="제조사"
            onChange={(e) => setManufacturer(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="현대모비스">현대모비스</MenuItem>
            <MenuItem value="만도">만도</MenuItem>
            <MenuItem value="한온시스템">한온시스템</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>부품번호</TableCell>
              <TableCell>부품명</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>제조사</TableCell>
              <TableCell align="right">현재고</TableCell>
              <TableCell align="right">가격</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.parts.map((part: Part) => (
              <TableRow key={part.id}>
                <TableCell>{part.partNumber}</TableCell>
                <TableCell>
                  <Tooltip title={part.description}>
                    <Typography>{part.name}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{part.category}</TableCell>
                <TableCell>{part.manufacturer}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${part.currentStock}${part.unitOfMeasure}`}
                    color={getStockStatusColor(part.currentStock, part.minStock)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {part.price.toLocaleString()}원
                </TableCell>
                <TableCell>
                  <Chip
                    label={part.status}
                    color={part.status === PartStatus.ACTIVE ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Tooltip title="수정">
                      <IconButton size="small" onClick={() => {/* TODO: 수정 모달 열기 */}}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="재고 관리">
                      <IconButton size="small" onClick={() => {/* TODO: 재고 관리 모달 열기 */}}>
                        <InventoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="이력 조회">
                      <IconButton size="small" onClick={() => {/* TODO: 이력 조회 모달 열기 */}}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (window.confirm('이 부품을 삭제하시겠습니까?')) {
                            deleteMutation.mutate(part.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data?.total || 0}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행 수"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / 전체 ${count}`
          }
        />
      </TableContainer>
    </Box>
  );
};

export default PartList; 