import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Box, 
  Tab, 
  Tabs, 
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// 샘플 보고서 데이터
const sampleVehicleReport = {
  totalVehicles: 125,
  activeVehicles: 98,
  inMaintenance: 15,
  recalled: 12,
  byType: {
    SEDAN: 45,
    SUV: 38,
    TRUCK: 22,
    VAN: 10,
    ELECTRIC: 8,
    HYBRID: 2
  }
};

const sampleMaintenanceReport = {
  totalRecords: 342,
  completedMaintenance: 315,
  scheduledMaintenance: 27,
  averageCost: 254000,
  byMonth: {
    '1월': 28,
    '2월': 31,
    '3월': 26,
    '4월': 30,
    '5월': 32,
    '6월': 35,
    '7월': 38,
    '8월': 29,
    '9월': 32,
    '10월': 27,
    '11월': 18,
    '12월': 16
  }
};

const Reports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 페이지 로드시 데이터 가져오기
  useEffect(() => {
    // 실제 구현에서는 API 호출
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePeriodChange = (event: any) => {
    setPeriod(event.target.value);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // 실제 구현에서는 API 호출
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    doc.text('차량 정비 관리 보고서', 20, 20);
    doc.text(`생성 일자: ${new Date().toLocaleDateString()}`, 20, 30);
    
    if (tabValue === 0) {
      // 차량 보고서
      doc.text('차량 현황 보고서', 20, 40);
      
      const vehicleData = [
        ['총 차량', sampleVehicleReport.totalVehicles],
        ['활성 차량', sampleVehicleReport.activeVehicles],
        ['정비 중', sampleVehicleReport.inMaintenance],
        ['리콜', sampleVehicleReport.recalled]
      ];
      
      (doc as any).autoTable({
        head: [['구분', '수량']],
        body: vehicleData,
        startY: 50
      });
      
      const typeData = Object.entries(sampleVehicleReport.byType).map(([type, count]) => [type, count]);
      
      (doc as any).autoTable({
        head: [['차종', '수량']],
        body: typeData,
        startY: 110
      });
    } else {
      // 정비 보고서
      doc.text('정비 현황 보고서', 20, 40);
      
      const maintenanceData = [
        ['총 정비 건수', sampleMaintenanceReport.totalRecords],
        ['완료된 정비', sampleMaintenanceReport.completedMaintenance],
        ['예정된 정비', sampleMaintenanceReport.scheduledMaintenance],
        ['평균 정비 비용', `${sampleMaintenanceReport.averageCost.toLocaleString()}원`]
      ];
      
      (doc as any).autoTable({
        head: [['구분', '수량/금액']],
        body: maintenanceData,
        startY: 50
      });
      
      const monthlyData = Object.entries(sampleMaintenanceReport.byMonth).map(([month, count]) => [month, count]);
      
      (doc as any).autoTable({
        head: [['월별', '정비 건수']],
        body: monthlyData,
        startY: 110
      });
    }
    
    doc.save('maintenance-report.pdf');
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          보고서
        </Typography>
        <Box>
          <FormControl sx={{ minWidth: 120, mr: 2 }} size="small">
            <InputLabel id="period-select-label">기간</InputLabel>
            <Select
              labelId="period-select-label"
              id="period-select"
              value={period}
              label="기간"
              onChange={handlePeriodChange}
            >
              <MenuItem value="month">월간</MenuItem>
              <MenuItem value="quarter">분기</MenuItem>
              <MenuItem value="year">연간</MenuItem>
              <MenuItem value="custom">사용자 지정</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ mr: 1 }}
          >
            {refreshing ? <CircularProgress size={24} /> : '새로고침'}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<PrintIcon />} 
            onClick={handlePrintReport}
            sx={{ mr: 1 }}
          >
            인쇄
          </Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={handleDownloadReport}
          >
            다운로드
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="차량 보고서" />
          <Tab label="정비 보고서" />
          <Tab label="운영 보고서" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  총 차량
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleVehicleReport.totalVehicles}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  활성 차량
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleVehicleReport.activeVehicles}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  정비 중
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleVehicleReport.inMaintenance}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  리콜
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleVehicleReport.recalled}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ width: '100%' }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  차종별 현황
                </Typography>
                <Box sx={{ mt: 2, height: 300 }}>
                  {/* 실제 구현에서는 차트 컴포넌트 사용 */}
                  <Typography variant="body1">차트 영역</Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  총 정비 건수
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleMaintenanceReport.totalRecords}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  완료된 정비
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleMaintenanceReport.completedMaintenance}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  예정된 정비
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleMaintenanceReport.scheduledMaintenance}
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 100%', md: '1 1 calc(50% - 8px)', lg: '1 1 calc(25% - 12px)' } }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  평균 정비 비용
                </Typography>
                <Typography variant="h3" component="div">
                  {sampleMaintenanceReport.averageCost.toLocaleString()}원
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ width: '100%' }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  월별 정비 건수
                </Typography>
                <Box sx={{ mt: 2, height: 300 }}>
                  {/* 실제 구현에서는 차트 컴포넌트 사용 */}
                  <Typography variant="body1">차트 영역</Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            운영 보고서는 준비 중입니다.
          </Typography>
          <Typography variant="body1">
            향후 업데이트에서 제공될 예정입니다.
          </Typography>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Reports; 