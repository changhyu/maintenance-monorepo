import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Typography,
  Alert,
  Tooltip
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CachedIcon from '@mui/icons-material/Cached';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { STORES } from '../utils/indexedDBUtils';

/**
 * 데이터 관리 섹션 컴포넌트
 * IndexedDB 데이터 가져오기, 내보내기, 초기화 등의 기능 제공
 */
export const DataManagementSection: React.FC = () => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 각 주요 스토어에 대한 IndexedDB 훅 사용
  const todosStore = useIndexedDB(STORES.TODOS);
  const vehiclesStore = useIndexedDB(STORES.VEHICLES);
  const settingsStore = useIndexedDB(STORES.USER_SETTINGS);
  
  // 성공/오류 메시지 리셋
  const resetMessages = () => {
    setSuccess(null);
    setError(null);
  };

  // 특정 저장소 초기화
  const handleClearStore = async (storeName: string) => {
    resetMessages();
    
    try {
      let store;
      switch (storeName) {
        case STORES.TODOS:
          store = todosStore;
          break;
        case STORES.VEHICLES:
          store = vehiclesStore;
          break;
        case STORES.USER_SETTINGS:
          store = settingsStore;
          break;
        default:
          throw new Error('지원되지 않는 저장소입니다.');
      }
      
      await store.clearAll();
      setSuccess(`${storeName} 데이터가 성공적으로 초기화되었습니다.`);
    } catch (err) {
      setError(`${storeName} 초기화 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  // 새로고침 기능
  const handleRefresh = async () => {
    resetMessages();
    
    try {
      await Promise.all([
        todosStore.fetchAll(),
        vehiclesStore.fetchAll(),
        settingsStore.fetchAll()
      ]);
      
      setSuccess('데이터가 성공적으로 새로고침되었습니다.');
    } catch (err) {
      setError(`데이터 새로고침 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  return (
    <Card>
      <CardHeader 
        title="데이터 관리" 
        subheader="오프라인 데이터 가져오기, 내보내기 및 초기화" 
      />
      <Divider />
      <CardContent>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              데이터 가져오기/내보내기
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<UploadIcon />}
                onClick={() => setImportDialogOpen(true)}
              >
                데이터 가져오기
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialogOpen(true)}
              >
                데이터 내보내기
              </Button>
              <Tooltip title="모든 데이터를 새로고침합니다">
                <Button 
                  variant="outlined" 
                  startIcon={<CachedIcon />}
                  onClick={handleRefresh}
                >
                  새로고침
                </Button>
              </Tooltip>
            </Box>
          </Grid>
          
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              데이터 초기화
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="모든 할 일 항목 데이터를 삭제합니다">
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={() => handleClearStore(STORES.TODOS)}
                >
                  할 일 항목 초기화
                </Button>
              </Tooltip>
              <Tooltip title="모든 차량 정보 데이터를 삭제합니다">
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={() => handleClearStore(STORES.VEHICLES)}
                >
                  차량 정보 초기화
                </Button>
              </Tooltip>
              <Tooltip title="모든 사용자 설정을 삭제합니다">
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={() => handleClearStore(STORES.USER_SETTINGS)}
                >
                  설정 초기화
                </Button>
              </Tooltip>
            </Box>
          </Grid>
          
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              참고: 데이터 초기화 시 해당 항목의 모든 정보가 영구적으로 삭제됩니다. 
              중요한 데이터는 미리 내보내기 기능을 통해 백업하세요.
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      
      {/* 가져오기/내보내기 다이얼로그 */}
      <ImportDialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
      />
      <ExportDialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)} 
      />
    </Card>
  );
}; 