import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  CircularProgress,
  Chip,
  Paper
} from '@mui/material';
import {
  Storage as StorageIcon,
  CloudDownload as CloudIcon,
  Report as ReportIcon
} from '@mui/icons-material';
import { exportService } from '../services/exportService';
import { reportService, ReportType, Report } from '../services/reportService';
import { DataManagementSection } from './DataManagementSection';

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
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// 보고서 카드 컴포넌트
const ReportCard = ({ report, onView, onExport, onDelete }: any) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {report.title || report.name}
        </Typography>
        <Box sx={{ display: 'flex', mb: 2 }}>
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
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button size="small" onClick={() => onView(report)}>상세 보기</Button>
          <Button size="small" onClick={() => onExport(report)}>내보내기</Button>
          <Button size="small" color="error" onClick={() => onDelete(report)}>삭제</Button>
        </Box>
      </CardContent>
    </Card>
  );
};

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
 * 보고서 목록 페이지 컴포넌트
 */
const ReportListPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [onlineReports, setOnlineReports] = useState<Report[]>([]);
  const [offlineReports, setOfflineReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 탭 변경 핸들러
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 온라인 보고서 로드
  const loadOnlineReports = async () => {
    setIsLoading(true);
    try {
      const reports = await reportService.getReports();
      setOnlineReports(reports);
    } catch (error) {
      console.error('온라인 보고서 로드 실패:', error);
      setError('온라인 보고서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 오프라인 보고서 로드
  const loadOfflineReports = async () => {
    setIsLoading(true);
    try {
      const reports = await exportService.getReportsFromIndexedDB();
      setOfflineReports(reports);
    } catch (error) {
      console.error('오프라인 보고서 로드 실패:', error);
      setError('오프라인 보고서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지 로드 시 보고서 데이터 로드
  useEffect(() => {
    loadOnlineReports();
    loadOfflineReports();
  }, []);

  // 보고서 상세 보기
  const handleViewReport = (report: Report) => {
    // 상세 보기 구현
    console.log('보고서 상세 보기:', report);
  };

  // 보고서 내보내기
  const handleExportReport = (report: Report) => {
    // 내보내기 구현
    console.log('보고서 내보내기:', report);
  };

  // 온라인 보고서 삭제
  const handleDeleteOnlineReport = async (report: Report) => {
    try {
      await reportService.deleteReport(report.id);
      await loadOnlineReports();
    } catch (error) {
      console.error('보고서 삭제 실패:', error);
      setError('보고서 삭제 중 오류가 발생했습니다.');
    }
  };

  // 오프라인 보고서 삭제
  const handleDeleteOfflineReport = async (report: any) => {
    try {
      await exportService.deleteReportFromIndexedDB(report.id);
      await loadOfflineReports();
    } catch (error) {
      console.error('오프라인 보고서 삭제 실패:', error);
      setError('오프라인 보고서 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        보고서 관리
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab 
          label="온라인 보고서" 
          icon={<CloudIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="오프라인 저장 보고서" 
          icon={<StorageIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="데이터 관리" 
          iconPosition="start"
        />
      </Tabs>

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

      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>온라인 보고서 목록</Typography>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : onlineReports.length > 0 ? (
          <Grid container spacing={2}>
            {onlineReports.map(report => (
              <Grid item xs={12} sm={6} md={4} key={report.id}>
                <ReportCard 
                  report={report} 
                  onView={handleViewReport} 
                  onExport={handleExportReport} 
                  onDelete={handleDeleteOnlineReport} 
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">저장된 온라인 보고서가 없습니다.</Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>오프라인 저장 보고서 목록</Typography>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : offlineReports.length > 0 ? (
          <Grid container spacing={2}>
            {offlineReports.map(report => (
              <Grid item xs={12} sm={6} md={4} key={report.id}>
                <ReportCard 
                  report={report} 
                  onView={handleViewReport} 
                  onExport={handleExportReport} 
                  onDelete={handleDeleteOfflineReport} 
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              저장된 오프라인 보고서가 없습니다.
              <br />
              보고서 생성 시 &apos;IndexedDB에 저장&apos; 옵션을 선택하면 오프라인에서도 조회할 수 있습니다.
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <DataManagementSection />
      </TabPanel>
    </Box>
  );
};

export default ReportListPage;