import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { driverService } from '../../services/driverService';

interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: string;
}

interface DriverDocumentsProps {
  driverId: string;
  onError?: (error: string) => void;
}

const DOCUMENT_TYPES = {
  license: '운전면허증',
  insurance: '보험증서',
  contract: '계약서',
  medical: '건강검진결과',
  training: '교육이수증',
  other: '기타',
};

const DriverDocuments: React.FC<DriverDocumentsProps> = ({ driverId, onError }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  const handleDialogClose = () => {
    setUploadDialogOpen(false);
    setSelectedType('');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedType) return;

    try {
      setLoading(true);
      setError(null);
      const url = await driverService.uploadDriverDocument(driverId, file, selectedType);
      
      // 새로운 문서를 목록에 추가
      const newDocument: Document = {
        id: Date.now().toString(), // 임시 ID
        type: selectedType,
        name: file.name,
        url,
        uploadedAt: new Date().toISOString(),
      };
      setDocuments([...documents, newDocument]);
      
      handleDialogClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '문서 업로드에 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);
      // TODO: API 호출로 문서 삭제
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '문서 삭제에 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">문서 관리</Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUploadClick}
            disabled={loading}
          >
            문서 업로드
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {documents.map((document) => (
              <ListItem key={document.id}>
                <ListItemText
                  primary={DOCUMENT_TYPES[document.type as keyof typeof DOCUMENT_TYPES]}
                  secondary={`${document.name} - 업로드: ${new Date(document.uploadedAt).toLocaleDateString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="보기"
                    onClick={() => window.open(document.url, '_blank')}
                    sx={{ mr: 1 }}
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="삭제"
                    onClick={() => handleDelete(document.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {documents.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                등록된 문서가 없습니다.
              </Typography>
            )}
          </List>
        )}

        <Dialog open={uploadDialogOpen} onClose={handleDialogClose}>
          <DialogTitle>문서 업로드</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>문서 종류</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                label="문서 종류"
              >
                {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>취소</Button>
            <Button
              variant="contained"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedType}
            >
              파일 선택
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DriverDocuments; 