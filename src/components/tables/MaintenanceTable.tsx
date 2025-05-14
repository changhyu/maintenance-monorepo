import React, { useState, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Box,
  Typography,
  Skeleton,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Maintenance } from '../../types/maintenance';
import { Vehicle } from '../../types/vehicle';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MaintenanceTableProps {
  maintenances: (Maintenance & { vehicle?: Vehicle })[];
  onRowClick?: (maintenance: Maintenance) => void;
  onEdit?: (maintenance: Maintenance) => void;
  onDelete?: (maintenance: Maintenance) => void;
  onComplete?: (maintenance: Maintenance) => void;
  onCancel?: (maintenance: Maintenance) => void;
  showActions?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (orderBy: string, order: 'asc' | 'desc') => void;
  loading?: boolean;
  error?: string;
}

type Order = 'asc' | 'desc';
type OrderBy = 'scheduledDate' | 'status' | 'type' | 'description' | 'costSummary.finalTotal';

export const MaintenanceTable: React.FC<MaintenanceTableProps> = React.memo(({
  maintenances,
  onRowClick,
  onEdit,
  onDelete,
  onComplete,
  onCancel,
  showActions = true,
  total,
  page = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  loading = false,
  error,
}) => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('scheduledDate');

  const handleChangePage = (event: unknown, newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    if (onPageSizeChange) {
      onPageSizeChange(newRowsPerPage);
      if (onPageChange) onPageChange(0);
    }
  };

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    setOrder(newOrder);
    setOrderBy(property);
    
    if (onSortChange) {
      onSortChange(property, newOrder);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd', { locale: ko });
    } catch (error) {
      return '-';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getStatusChip = useMemo(() => {
    return (status: string) => {
      let color:
        | 'default'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning';
      let label: string;

      switch (status) {
        case 'scheduled':
          color = 'info';
          label = '예정';
          break;
        case 'in_progress':
          color = 'warning';
          label = '진행 중';
          break;
        case 'completed':
          color = 'success';
          label = '완료';
          break;
        case 'cancelled':
          color = 'error';
          label = '취소';
          break;
        default:
          color = 'default';
          label = status;
      }

      return <Chip size="small" color={color} label={label} />;
    };
  }, []);

  const getTypeLabel = useMemo(() => {
    return (type: string) => {
      switch (type) {
        case 'regular':
          return '정기 점검';
        case 'repair':
          return '수리';
        case 'inspection':
          return '검사';
        default:
          return type;
      }
    };
  }, []);

  const getSortedRows = () => {
    if (onPageChange && onPageSizeChange && onSortChange) {
      return maintenances;
    }
    
    return maintenances
      .slice()
      .sort((a, b) => {
        let comparator: number;

        if (orderBy === 'costSummary.finalTotal') {
          comparator =
            (a.costSummary?.finalTotal || 0) - (b.costSummary?.finalTotal || 0);
        } else if (orderBy === 'scheduledDate') {
          const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
          const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
          comparator = dateA - dateB;
        } else {
          const aValue = a[orderBy] || '';
          const bValue = b[orderBy] || '';
          comparator = aValue.toString().localeCompare(bValue.toString());
        }

        return order === 'asc' ? comparator : -comparator;
      })
      .slice(page * pageSize, page * pageSize + pageSize);
  };

  const handleRowClick = (maintenance: Maintenance) => {
    if (onRowClick) {
      onRowClick(maintenance);
    }
  };

  const sortedRows = useMemo(() => getSortedRows(), [maintenances, order, orderBy, page, pageSize, onPageChange, onPageSizeChange, onSortChange]);

  const renderSkeletonRows = () => {
    return Array(pageSize).fill(0).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell>
          <Skeleton animation="wave" width="80%" />
        </TableCell>
        <TableCell>
          <Skeleton animation="wave" width={80} height={24} variant="rounded" />
        </TableCell>
        <TableCell>
          <Skeleton animation="wave" width="70%" />
        </TableCell>
        <TableCell>
          <Skeleton animation="wave" width="90%" />
        </TableCell>
        <TableCell>
          <Skeleton animation="wave" width="85%" />
        </TableCell>
        <TableCell>
          <Skeleton animation="wave" width="60%" />
        </TableCell>
        {showActions && (
          <TableCell align="center">
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Skeleton animation="wave" variant="circular" width={30} height={30} />
              <Skeleton animation="wave" variant="circular" width={30} height={30} />
              <Skeleton animation="wave" variant="circular" width={30} height={30} />
            </Box>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  const renderTableBody = () => {
    if (loading) {
      return renderSkeletonRows();
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={showActions ? 7 : 6} align="center">
            <Typography color="error" variant="body1">
              {error}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (maintenances.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={showActions ? 7 : 6} align="center">
            <Typography variant="body1">
              조회된 정비 기록이 없습니다.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return sortedRows.map((maintenance) => (
      <TableRow
        key={maintenance.id}
        hover
        onClick={() => handleRowClick(maintenance)}
        sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
      >
        <TableCell>{formatDate(maintenance.scheduledDate)}</TableCell>
        <TableCell>{getStatusChip(maintenance.status)}</TableCell>
        <TableCell>{getTypeLabel(maintenance.type)}</TableCell>
        <TableCell>{maintenance.description}</TableCell>
        <TableCell>
          {maintenance.vehicle
            ? `${maintenance.vehicle.make} ${maintenance.vehicle.model}`
            : maintenance.vehicleId}
        </TableCell>
        <TableCell>
          {formatCurrency(maintenance.costSummary?.finalTotal || 0)}
        </TableCell>
        {showActions && (
          <TableCell align="center">
            <Tooltip title="상세 보기">
              <IconButton
                size="small"
                color="info"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRowClick) onRowClick(maintenance);
                }}
              >
                <ViewIcon />
              </IconButton>
            </Tooltip>
            
            {maintenance.status !== 'completed' && maintenance.status !== 'cancelled' && (
              <>
                <Tooltip title="수정">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEdit) onEdit(maintenance);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                
                {maintenance.status === 'scheduled' && (
                  <Tooltip title="완료">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onComplete) onComplete(maintenance);
                      }}
                    >
                      <CompleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title="취소">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCancel) onCancel(maintenance);
                    }}
                  >
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            
            <Tooltip title="삭제">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete) onDelete(maintenance);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
      {loading && <LinearProgress />}
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'scheduledDate'}
                  direction={orderBy === 'scheduledDate' ? order : 'asc'}
                  onClick={() => handleRequestSort('scheduledDate')}
                >
                  날짜
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  상태
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'type'}
                  direction={orderBy === 'type' ? order : 'asc'}
                  onClick={() => handleRequestSort('type')}
                >
                  유형
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'description'}
                  direction={orderBy === 'description' ? order : 'asc'}
                  onClick={() => handleRequestSort('description')}
                >
                  설명
                </TableSortLabel>
              </TableCell>
              <TableCell>차량</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'costSummary.finalTotal'}
                  direction={orderBy === 'costSummary.finalTotal' ? order : 'asc'}
                  onClick={() => handleRequestSort('costSummary.finalTotal')}
                >
                  비용
                </TableSortLabel>
              </TableCell>
              {showActions && <TableCell align="center">액션</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={total || maintenances.length}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="페이지당 행 수:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Paper>
  );
});

export default MaintenanceTable; 