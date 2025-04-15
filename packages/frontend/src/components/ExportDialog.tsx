import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { useExport } from '../hooks/useExport';
import { STORES } from '../utils/indexedDBUtils';
import type { ExportFormat } from '../utils/exportUtils';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`export-tabpanel-${index}`}
      aria-labelledby={`export-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `export-tab-${index}`,
    'aria-controls': `export-tabpanel-${index}`,
  };
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedStore, setSelectedStore] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [success, setSuccess] = useState<string | null>(null);
  
  const { isExporting, exportStore, exportAllOfflineData, error } = useExport();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSuccess(null);
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExportFormat(event.target.value as ExportFormat);
  };

  const handleExportStore = async () => {
    if (selectedStore) {
      const result = await exportStore(selectedStore, `${selectedStore}_export`, exportFormat);
      if (result) {
        setSuccess(`${selectedStore} 스토어를 ${exportFormat} 형식으로 내보내기 완료했습니다.`);
      }
    }
  };

  const handleExportAllData = async () => {
    const result = await exportAllOfflineData(exportFormat);
    if (result) {
      setSuccess(`모든 오프라인 데이터를 ${exportFormat} 형식으로 내보내기 완료했습니다.`);
    }
  };

  const stores = Object.values(STORES);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>데이터 내보내기</DialogTitle>
      <DialogContent>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="export options tabs">
          <Tab label="특정 스토어 내보내기" {...a11yProps(0)} />
          <Tab label="모든 데이터 내보내기" {...a11yProps(1)} />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {/* 내보내기 형식 선택 - 모든 탭에서 공통 */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            내보내기 형식 선택
          </Typography>
          <RadioGroup
            row
            name="export-format"
            value={exportFormat}
            onChange={handleFormatChange}
          >
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            <FormControlLabel value="excel" control={<Radio />} label="Excel" />
            <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
          </RadioGroup>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="body1" gutterBottom>
            특정 IndexedDB 스토어의 데이터를 내보냅니다.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>스토어 선택</InputLabel>
              <Select
                value={selectedStore}
                label="스토어 선택"
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                {stores.map((store) => (
                  <MenuItem key={store} value={store}>{store}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleExportStore}
              disabled={isExporting || !selectedStore}
            >
              {isExporting ? <CircularProgress size={24} /> : '스토어 내보내기'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1" gutterBottom>
            모든 IndexedDB 스토어 데이터와 진단 정보를 하나의 파일로 내보냅니다.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleExportAllData}
              disabled={isExporting}
            >
              {isExporting ? <CircularProgress size={24} /> : '모든 데이터 내보내기'}
            </Button>
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}; 