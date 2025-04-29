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
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
  ContactPhone as ContactPhoneIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
  code: string;
  businessNumber: string;
  category: string;
  status: string;
  address: string;
  contacts: {
    id: string;
    name: string;
    position: string;
    phone: string;
    email: string;
  }[];
  ratings: {
    id: string;
    score: number;
    date: string;
  }[];
}

const SupplierList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 공급업체 목록 조회
  const { data, isLoading, error } = useQuery(
    ['suppliers', page, rowsPerPage, searchTerm, category, status, sortBy, sortOrder],
    async () => {
      const response = await fetch(
        `/api/v1/maintenance/suppliers?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}&category=${category}&status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      );
      if (!response.ok) throw new Error('공급업체 목록을 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 공급업체 삭제
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await fetch(`/api/v1/maintenance/suppliers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('공급업체 삭제에 실패했습니다.');
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['suppliers']);
      },
    }
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLatestRating = (ratings: Supplier['ratings']) => {
    if (!ratings || ratings.length === 0) return null;
    return ratings[0];
  };

  if (isLoading) return <Typography>로딩 중...</Typography>;
  if (error) return <Typography color="error">에러가 발생했습니다.</Typography>;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          공급업체 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* TODO: 공급업체 등록 모달 열기 */}}
        >
          공급업체 등록
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
            onChange={(e) => setCategory(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="PARTS">부품</MenuItem>
            <MenuItem value="TOOLS">공구</MenuItem>
            <MenuItem value="CONSUMABLES">소모품</MenuItem>
            <MenuItem value="EQUIPMENT">장비</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={status}
            label="상태"
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="ACTIVE">활성</MenuItem>
            <MenuItem value="INACTIVE">비활성</MenuItem>
            <MenuItem value="SUSPENDED">정지</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>코드</TableCell>
              <TableCell>업체명</TableCell>
              <TableCell>사업자번호</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>연락처</TableCell>
              <TableCell>평가</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.suppliers.map((supplier: Supplier) => {
              const latestRating = getLatestRating(supplier.ratings);
              const mainContact = supplier.contacts[0];

              return (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.code}</TableCell>
                  <TableCell>
                    <Tooltip title={supplier.address}>
                      <Typography>{supplier.name}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{supplier.businessNumber}</TableCell>
                  <TableCell>{supplier.category}</TableCell>
                  <TableCell>
                    {mainContact && (
                      <Tooltip title={`${mainContact.position} - ${mainContact.email}`}>
                        <Typography>{mainContact.name} ({mainContact.phone})</Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    {latestRating && (
                      <Chip
                        icon={<StarIcon />}
                        label={`${latestRating.score}점`}
                        size="small"
                        color={latestRating.score >= 4 ? 'success' : latestRating.score >= 3 ? 'warning' : 'error'}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.status}
                      color={getStatusColor(supplier.status)}
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
                      <Tooltip title="연락처 관리">
                        <IconButton size="small" onClick={() => {/* TODO: 연락처 관리 모달 열기 */}}>
                          <ContactPhoneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="실적 분석">
                        <IconButton size="small" onClick={() => {/* TODO: 실적 분석 모달 열기 */}}>
                          <AssessmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="평가">
                        <IconButton size="small" onClick={() => {/* TODO: 평가 모달 열기 */}}>
                          <StarIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('이 공급업체를 삭제하시겠습니까?')) {
                              deleteMutation.mutate(supplier.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

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
    </Box>
  );
};

export default SupplierList; 