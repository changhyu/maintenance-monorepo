import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';

import { Report, ReportType } from '../../services/reportService';
import { exportService } from '../../services/exportService';
import ExportOptionsForm from './ExportOptionsForm';

interface ReportBatchExportProps {
  reports: Report[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 여러 보고서를 한꺼번에 내보내기 위한 컴포넌트
 */
const ReportBatchExport: React.FC<ReportBatchExportProps> = ({ 
  reports, 
  isOpen, 
  onClose 
}) => {
  const [selectedReports, setSelectedReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 모든 보고서 선택/해제
  const handleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports([...reports]);
    }
  };

  // 개별 보고서 선택/해제
  const handleToggleReport = (report: Report) => {
    const currentIndex = selectedReports.findIndex(r => r.id === report.id);
    const newSelected = [...selectedReports];

    if (currentIndex === -1) {
      newSelected.push(report);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedReports(newSelected);
  };

  // 보고서 유형에 따라 표시 이름 반환
  const getReportTypeName = (type: ReportType): string => {
    const typeMap: Record<ReportType, string> = {
      completion_rate: '완료율 보고서',
      vehicle_history: '차량 정비 이력 보고서',
      cost_analysis: '비용 분석 보고서',
      maintenance_summary: '정비 요약 보고서',
      maintenance_forecast: '정비 예측 보고서',
      vehicle_utilization: '차량 활용도 보고서',
      maintenance_completion_rate: '정비 완료율 보고서',
      predictive_maintenance: '예측 정비 보고서',
      parts_usage: '부품 사용 보고서'
    };
    
    return typeMap[type] || '알 수 없는 보고서';
  };

  // 내보내기 실행
  const handleExport = async (options: any) => {
    if (selectedReports.length === 0) {
      setError('내보낼 보고서를 하나 이상 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      await exportService.exportMultipleReports(selectedReports, options);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('보고서 내보내기 실패:', error);
      setError('보고서 내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Typography variant="h6">
          <DownloadIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          다중 보고서 내보내기
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            보고서 내보내기가 완료되었습니다.
          </Alert>
        )}

        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            내보낼 보고서 선택
            <Button 
              size="small" 
              onClick={handleSelectAll}
              sx={{ ml: 2 }}
            >
              {selectedReports.length === reports.length ? '모두 해제' : '모두 선택'}
            </Button>
          </Typography>

          <List sx={{ maxHeight: '250px', overflow: 'auto', bgcolor: 'background.paper' }}>
            {reports.map((report) => (
              <ListItem
                key={report.id}
                dense
                component="div"
                onClick={() => handleToggleReport(report)}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedReports.some(r => r.id === report.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={report.title}
                  secondary={`${getReportTypeName(report.type)} - ${new Date(report.createdAt).toLocaleDateString()}`}
                />
              </ListItem>
            ))}
            {reports.length === 0 && (
              <ListItem component="div">
                <ListItemText primary="내보낼 수 있는 보고서가 없습니다." />
              </ListItem>
            )}
          </List>
        </Paper>

        <Divider sx={{ my: 2 }} />

        <ExportOptionsForm
          onExport={handleExport}
          isLoading={isLoading}
          multipleReports={true}
        />
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit"
          disabled={isLoading}
        >
          취소
        </Button>
        {isLoading && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </DialogActions>
    </Dialog>
  );
};

export default ReportBatchExport; 