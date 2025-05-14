import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Divider, 
  Alert, 
  AlertTitle,
  Snackbar
} from '@mui/material';
import { MaintenanceTable } from '../components/tables/MaintenanceTable';
import MaintenanceFilters from '../components/maintenance/MaintenanceFilters';
import { useNavigate } from 'react-router-dom';
import { Maintenance, MaintenanceFilters as FiltersType } from '../types/maintenance';
import { useMaintenances } from '../hooks/useMaintenances';

// 성능 메트릭 로깅 함수
const logPerformanceMetric = (operation: string, metrics: Record<string, any>) => {
  console.info(`Performance Metric [${operation}]:`, metrics);
  // 실제 프로덕션 환경에서는, 분석 서비스로 메트릭을 전송할 수 있음
};

const MaintenanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersType>({});
  const [page, setPage] = useState(0); // Material-UI의 TablePagination은 0부터 시작
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('scheduledDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [showPerformanceAlert, setShowPerformanceAlert] = useState(false);

  // 데이터 로딩 시작 시간
  const startTime = performance.now();

  // React Query를 사용하여 데이터 로드
  const { 
    data, 
    isLoading, 
    isFetching,
    isError, 
    error, 
    refetch 
  } = useMaintenances(
    filters, 
    page + 1, // API는 1부터 시작하는 페이지 번호 사용
    pageSize,
    sortBy,
    sortOrder
  );

  // 데이터 로딩 완료 시 성능 측정
  useEffect(() => {
    if (!isLoading && !isFetching && data) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setLoadTime(duration);
      
      // 페이지 로딩 성능 메트릭 로깅
      logPerformanceMetric('maintenances_load', {
        duration,
        itemCount: data.items.length,
        totalCount: data.pagination.total,
        page: data.pagination.page,
        pageSize: data.pagination.size,
        filterCount: Object.keys(filters).filter(key => !!filters[key as keyof FiltersType]).length
      });

      // 로딩 시간이 1초 이상이면 성능 경고 표시
      if (duration > 1000) {
        setShowPerformanceAlert(true);
        console.warn(`정비 목록 로딩에 ${duration.toFixed(0)}ms가 소요되었습니다. 최적화가 필요할 수 있습니다.`);
      }
    }
  }, [isLoading, isFetching, data]);

  const handleRowClick = (maintenance: Maintenance) => {
    navigate(`/maintenance/${maintenance.id}`);
  };

  const handleFilterChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
    setPage(0); // 필터 변경 시 첫 페이지로 리셋
  };

  const handleFilterReset = () => {
    setFilters({});
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0); // 페이지 크기 변경 시 첫 페이지로 리셋
  };

  const handleSortChange = (property: string, order: 'asc' | 'desc') => {
    setSortBy(property);
    setSortOrder(order);
  };

  const handleClosePerformanceAlert = () => {
    setShowPerformanceAlert(false);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          정비 관리
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          차량 정비 기록을 관리하고 조회합니다.
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <MaintenanceFilters 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            onReset={handleFilterReset} 
          />
        </Paper>

        {isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>오류 발생</AlertTitle>
            정비 목록을 불러오는 중 오류가 발생했습니다. {error instanceof Error && error.message}
          </Alert>
        )}

        <MaintenanceTable 
          maintenances={data?.items || []} 
          total={data?.pagination.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onRowClick={handleRowClick}
          loading={isLoading || isFetching}
          error={isError ? (error instanceof Error ? error.message : '오류가 발생했습니다') : undefined}
        />

        {loadTime && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'right' }}>
            로딩 시간: {loadTime.toFixed(0)}ms
          </Typography>
        )}

        <Snackbar
          open={showPerformanceAlert}
          autoHideDuration={6000}
          onClose={handleClosePerformanceAlert}
          message={`성능 알림: 데이터 로딩에 ${loadTime?.toFixed(0)}ms가 소요되었습니다. 최적화를 고려해보세요.`}
        />
      </Box>
    </Container>
  );
};

export default MaintenanceListPage; 