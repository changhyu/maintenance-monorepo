import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  Divider,
  Chip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  DataObject as JsonIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import { Report, ReportType, ReportFormat } from '../services/reportService';
import { exportService } from '../services/exportService';

interface ReportViewerProps {
  report: any; // Report 또는 IndexedDB에 저장된 보고서
  open: boolean;
  onClose: () => void;
  isOfflineReport?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// 탭 패널 컴포넌트
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-viewer-tabpanel-${index}`}
      aria-labelledby={`report-viewer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// 보고서 유형 이름 변환 함수
const getReportTypeName = (type: ReportType): string => {
  const reportTypes: Record<ReportType, string> = {
    [ReportType.COMPLETION_RATE]: '완료율 보고서',
    [ReportType.VEHICLE_HISTORY]: '차량 이력 보고서',
    [ReportType.COST_ANALYSIS]: '비용 분석 보고서',
    [ReportType.MAINTENANCE_SUMMARY]: '정비 요약 보고서',
    [ReportType.MAINTENANCE_FORECAST]: '정비 예측 보고서',
    [ReportType.VEHICLE_UTILIZATION]: '차량 활용도 보고서',
    [ReportType.MAINTENANCE_COMPLETION_RATE]: '정비 완료율 보고서',
    [ReportType.PREDICTIVE_MAINTENANCE]: '예측 정비 보고서',
    [ReportType.PARTS_USAGE]: '부품 사용 보고서'
  };
  
  return reportTypes[type] || '알 수 없는 보고서';
};

/**
 * 보고서 조회 다이얼로그 컴포넌트
 */
const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  open,
  onClose,
  isOfflineReport = false
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 탭 변경 핸들러
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 보고서 내보내기 핸들러
  const handleExportReport = async (format: ReportFormat) => {
    setIsExporting(true);
    setError(null);
    
    try {
      // 오프라인 저장 보고서인 경우
      if (isOfflineReport) {
        // 보고서 데이터와 내보내기 옵션 가져오기
        const reportData = report.data || [];
        const exportOptions = {
          ...report.exportOptions,
          format
        };
        
        // 보고서 이름 설정
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `${report.name || 'report'}_${timestamp}`;
        
        // 데이터 내보내기
        switch (format) {
          case ReportFormat.PDF:
            // PDF 내보내기 로직
            break;
          case ReportFormat.EXCEL:
            // Excel 내보내기 로직
            break;
          case ReportFormat.CSV:
            // CSV 내보내기 로직
            break;
          case ReportFormat.JSON:
            // JSON 내보내기 로직
            const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
              type: 'application/json' 
            });
            saveAs(blob, `${filename}.json`);
            break;
        }
      } else {
        // 온라인 보고서인 경우 API 호출
        // TODO: API를 통한 보고서 내보내기 구현
      }
    } catch (err) {
      console.error('보고서 내보내기 중 오류 발생:', err);
      setError('보고서 내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // 보고서 데이터 렌더링
  const renderReportData = () => {
    // 오프라인 보고서와 온라인 보고서의 데이터 구조가 다를 수 있음
    const data = isOfflineReport ? report.data : report.data;
    
    if (!data) {
      return <Typography>데이터가 없습니다.</Typography>;
    }
    
    // 보고서 유형에 따른 렌더링
    switch (report.type) {
      case ReportType.COMPLETION_RATE:
        return renderCompletionRateReport(data);
      case ReportType.VEHICLE_HISTORY:
        return renderVehicleHistoryReport(data);
      case ReportType.COST_ANALYSIS:
        return renderCostAnalysisReport(data);
      case ReportType.MAINTENANCE_SUMMARY:
        return renderMaintenanceSummaryReport(data);
      case ReportType.MAINTENANCE_FORECAST:
        return renderMaintenanceForecastReport(data);
      default:
        // 기본적으로 JSON으로 표시
        return (
          <pre style={{ 
            overflow: 'auto', 
            maxHeight: '500px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5' 
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  // 완료율 보고서 렌더링
  const renderCompletionRateReport = (data: any) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>완료율 개요</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">
            전체 작업: {data.totalTasks}개<br />
            완료 작업: {data.completedTasks}개<br />
            완료율: {(data.completionRate * 100).toFixed(1)}%
          </Typography>
        </Paper>
        
        {/* 추가 데이터 렌더링 */}
      </Box>
    );
  };

  // 차량 이력 보고서 렌더링
  const renderVehicleHistoryReport = (data: any) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>차량 정보</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">
            {data.vehicleInfo?.name || '차량명 없음'} ({data.vehicleInfo?.model} {data.vehicleInfo?.year})<br />
            등록번호: {data.vehicleInfo?.registrationNumber}<br />
            총 정비 비용: {data.totalCost?.toLocaleString()}원
          </Typography>
        </Paper>
        
        {/* 추가 데이터 렌더링 */}
      </Box>
    );
  };

  // 비용 분석 보고서 렌더링
  const renderCostAnalysisReport = (data: any) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>비용 분석</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">
            총 비용: {data.totalCost?.toLocaleString()}원<br />
            평균 차량당 비용: {data.averageCostPerVehicle?.toLocaleString()}원
          </Typography>
        </Paper>
        
        {/* 추가 데이터 렌더링 */}
      </Box>
    );
  };

  // 정비 요약 보고서 렌더링
  const renderMaintenanceSummaryReport = (data: any) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>정비 요약</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">
            기간: {data.period?.start} ~ {data.period?.end}<br />
            총 차량 수: {data.overview?.totalVehicles}대<br />
            총 정비 건수: {data.overview?.totalMaintenances}건<br />
            차량당 평균 정비 건수: {data.overview?.averagePerVehicle}건
          </Typography>
        </Paper>
        
        {/* 추가 데이터 렌더링 */}
      </Box>
    );
  };

  // 정비 예측 보고서 렌더링
  const renderMaintenanceForecastReport = (data: any) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>정비 예측</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">
            예정된 정비: {data.upcoming?.length || 0}건<br />
            잠재적 문제: {data.potentialIssues?.length || 0}건
          </Typography>
        </Paper>
        
        {/* 추가 데이터 렌더링 */}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h6">
          {report.title || report.name || '보고서 상세'}
        </Typography>
        <Box sx={{ display: 'flex', mt: 1 }}>
          <Chip 
            label={getReportTypeName(report.type)} 
            color="primary" 
            size="small" 
            sx={{ mr: 1 }} 
          />
          <Chip 
            label={new Date(report.createdAt).toLocaleDateString()} 
            size="small" 
            variant="outlined" 
          />
          {isOfflineReport && (
            <Chip 
              label="오프라인 저장" 
              color="secondary" 
              size="small" 
              sx={{ ml: 1 }} 
            />
          )}
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        {error && (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 2, 
              bgcolor: 'error.light', 
              color: 'error.contrastText' 
            }}
          >
            {error}
          </Paper>
        )}
        
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="보고서 내용" icon={<TableIcon />} iconPosition="start" />
          <Tab label="원본 데이터" icon={<JsonIcon />} iconPosition="start" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          {renderReportData()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <pre style={{ 
            overflow: 'auto', 
            maxHeight: '500px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5' 
          }}>
            {JSON.stringify(isOfflineReport ? report.data : report.data, null, 2)}
          </pre>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => handleExportReport(ReportFormat.PDF)}
            disabled={isExporting}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportReport(ReportFormat.EXCEL)}
            disabled={isExporting}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportReport(ReportFormat.JSON)}
            disabled={isExporting}
          >
            JSON
          </Button>
        </Box>
        
        {isExporting && <CircularProgress size={24} sx={{ ml: 2 }} />}
        
        <Button onClick={onClose} color="inherit">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportViewer; 