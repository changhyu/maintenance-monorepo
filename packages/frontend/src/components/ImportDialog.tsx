import React, { useState, useRef, SyntheticEvent, ReactNode, useMemo, useCallback } from 'react';
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
  Divider,
  SelectChangeEvent
} from '@mui/material';
import { useImport } from '../hooks/useImport';
import { STORES } from '../utils/indexedDBUtils';

// STORES 타입 정의
type StoreType = typeof STORES[keyof typeof STORES];

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children: ReactNode;
  value: number;
  index: number;
  [key: string]: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  if (value !== index) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`import-tabpanel-${index}`}
      aria-labelledby={`import-tab-${index}`}
      tabIndex={0}
      {...other}
    >
      <div style={{ padding: '24px' }}>
        {children}
      </div>
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `import-tab-${index}`,
    'aria-controls': `import-tabpanel-${index}`,
    'aria-selected': false,
  };
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [sourceStore, setSourceStore] = useState<StoreType | ''>('');
  const [targetStore, setTargetStore] = useState<StoreType | ''>('');
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isImporting, importFromFile, importFromLocalStorage, mergeStores, error } = useImport();

  // 메모이제이션된 stores 배열
  const stores = useMemo(() => 
    Object.values(STORES).filter(store => 
      ![STORES.OFFLINE_MODE, STORES.PENDING_OPERATIONS].includes(store)
    ),
    []
  );

  const handleTabChange = useCallback((_event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSuccess(null);
  }, []);

  const handleSourceStoreChange = useCallback((event: SelectChangeEvent<StoreType | ''>) => {
    setSourceStore(event.target.value as StoreType | '');
  }, []);

  const handleTargetStoreChange = useCallback((event: SelectChangeEvent<StoreType | ''>) => {
    setTargetStore(event.target.value as StoreType | '');
  }, []);

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
    if (!sourceStore || !targetStore) {
      return;
    }

    try {
      const count = await mergeStores(sourceStore, targetStore);
      setSuccess(`${count}개 항목이 성공적으로 병합되었습니다.`);
    } catch (err) {
      // 오류는 useImport 훅에서 처리됨
      console.error('스토어 병합 중 오류 발생:', err);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      aria-labelledby="import-dialog-title"
    >
      <DialogTitle id="import-dialog-title">데이터 가져오기</DialogTitle>
      <DialogContent>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="import options tabs"
          variant="fullWidth"
        >
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
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2 }}>
            <TextField
              type="file"
              inputRef={fileInputRef}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ accept: 'application/json' }}
            />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleFileImport}
              disabled={isImporting}
              aria-label="파일에서 데이터 가져오기"
            >
              {isImporting ? <CircularProgress size={24} /> : '파일에서 가져오기'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1" gutterBottom>
            LocalStorage에 저장된 모든 애플리케이션 데이터를 IndexedDB로 가져옵니다.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleLocalStorageImport}
              disabled={isImporting}
              aria-label="LocalStorage에서 데이터 가져오기"
            >
              {isImporting ? <CircularProgress size={24} /> : 'LocalStorage에서 가져오기'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1" gutterBottom>
            한 스토어의 데이터를 다른 스토어로 병합합니다. 기존 데이터는 덮어쓰지 않습니다.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>원본 스토어</InputLabel>
              <Select
                value={sourceStore}
                label="원본 스토어"
                onChange={handleSourceStoreChange}
                aria-label="원본 스토어 선택"
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
                onChange={handleTargetStoreChange}
                aria-label="대상 스토어 선택"
              >
                {stores.map((store) => (
                  <MenuItem key={`target-${store}`} value={store}>{store}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleMergeStores}
              disabled={isImporting || !sourceStore || !targetStore || sourceStore === targetStore}
              aria-label="스토어 병합"
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