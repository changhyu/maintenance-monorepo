import React, { useState, useRef } from 'react';
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
  TextField,
  Divider
} from '@mui/material';
import { useImport } from '../hooks/useImport';
import { STORES } from '../utils/indexedDBUtils';

interface ImportDialogProps {
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
      id={`import-tabpanel-${index}`}
      aria-labelledby={`import-tab-${index}`}
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
    id: `import-tab-${index}`,
    'aria-controls': `import-tabpanel-${index}`,
  };
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [sourceStore, setSourceStore] = useState('');
  const [targetStore, setTargetStore] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isImporting, importFromFile, importFromLocalStorage, mergeStores, error } = useImport();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSuccess(null);
  };

  const handleFileImport = async () => {
    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0];
      const result = await importFromFile(file);
      if (result) {
        setSuccess(`파일에서 데이터를 성공적으로 가져왔습니다: ${file.name}`);
      }
    }
  };

  const handleLocalStorageImport = async () => {
    const result = await importFromLocalStorage();
    if (result) {
      setSuccess('LocalStorage에서 데이터를 성공적으로 가져왔습니다.');
    }
  };

  const handleMergeStores = async () => {
    if (sourceStore && targetStore) {
      try {
        const count = await mergeStores(sourceStore, targetStore);
        setSuccess(`${count}개 항목이 성공적으로 병합되었습니다.`);
      } catch (err) {
        // 오류는 useImport 훅에서 처리됨
      }
    }
  };

  const stores = Object.values(STORES).filter(store => 
    ![STORES.OFFLINE_MODE, STORES.PENDING_OPERATIONS].includes(store)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>데이터 가져오기</DialogTitle>
      <DialogContent>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="import options tabs">
          <Tab label="파일에서 가져오기" {...a11yProps(0)} />
          <Tab label="LocalStorage에서 가져오기" {...a11yProps(1)} />
          <Tab label="스토어 병합" {...a11yProps(2)} />
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

        <TabPanel value={tabValue} index={0}>
          <Typography variant="body1" gutterBottom>
            JSON 파일에서 데이터를 가져옵니다. 파일은 IndexedDB 스토어 구조와 일치해야 합니다.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <TextField
              type="file"
              inputRef={fileInputRef}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ accept: 'application/json' }}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleFileImport}
              disabled={isImporting}
            >
              {isImporting ? <CircularProgress size={24} /> : '파일에서 가져오기'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1" gutterBottom>
            LocalStorage에 저장된 모든 애플리케이션 데이터를 IndexedDB로 가져옵니다.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleLocalStorageImport}
              disabled={isImporting}
            >
              {isImporting ? <CircularProgress size={24} /> : 'LocalStorage에서 가져오기'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1" gutterBottom>
            한 스토어의 데이터를 다른 스토어로 병합합니다. 기존 데이터는 덮어쓰지 않습니다.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>원본 스토어</InputLabel>
              <Select
                value={sourceStore}
                label="원본 스토어"
                onChange={(e) => setSourceStore(e.target.value)}
              >
                {stores.map((store) => (
                  <MenuItem key={`source-${store}`} value={store}>{store}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>대상 스토어</InputLabel>
              <Select
                value={targetStore}
                label="대상 스토어"
                onChange={(e) => setTargetStore(e.target.value)}
              >
                {stores.map((store) => (
                  <MenuItem key={`target-${store}`} value={store}>{store}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleMergeStores}
              disabled={isImporting || !sourceStore || !targetStore || sourceStore === targetStore}
            >
              {isImporting ? <CircularProgress size={24} /> : '스토어 병합'}
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