import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  LocalHospital as HospitalIcon,
  LocalPolice as PoliceIcon,
  LocalFireDepartment as FireStationIcon,
  Report as ReportIcon
} from '@mui/icons-material';
import { SafetyData, getSafetyCategoryName, getSafetyColor } from '../services/safetyService';

interface SafetyInfoViewerProps {
  safetyData: SafetyData | null;
  onClose: () => void;
}

/**
 * SafetyInfoViewer 컴포넌트
 * 교통안전정보 상세 정보를 표시하는 모달 컴포넌트
 */
const SafetyInfoViewer: React.FC<SafetyInfoViewerProps> = ({ safetyData, onClose }) => {
  if (!safetyData) {
    return null;
  }
  
  // 심각도 표시 스타일
  const severityStyle = {
    HIGH: { bgColor: '#ffebee', color: '#d32f2f', label: '높음' },
    MEDIUM: { bgColor: '#fff8e1', color: '#ff8f00', label: '중간' },
    LOW: { bgColor: '#e8f5e9', color: '#2e7d32', label: '낮음' }
  };
  
  const severity = safetyData.severity || 'MEDIUM';
  
  return (
    <Dialog
      open={Boolean(safetyData)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="safety-info-dialog-title"
    >
      <DialogTitle 
        id="safety-info-dialog-title"
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: severityStyle[severity].bgColor
        }}
      >
        <Box display="flex" alignItems="center">
          <ReportIcon 
            sx={{ 
              mr: 1, 
              color: getSafetyColor(safetyData.largeCategory, safetyData.severity || 'MEDIUM') 
            }} 
          />
          <Typography variant="h6" component="span">
            {safetyData.vulnerableName || getSafetyCategoryName(safetyData.largeCategory, safetyData.mediumCategory)}
          </Typography>
        </Box>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="닫기">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ pt: 2 }}>
        {/* 심각도 표시 */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" component="span">
            교통안전 위험 정보
          </Typography>
          <Chip 
            label={`위험도: ${severityStyle[severity].label}`}
            sx={{ 
              bgcolor: severityStyle[severity].bgColor, 
              color: severityStyle[severity].color,
              fontWeight: 'bold'
            }}
          />
        </Box>
        
        {/* 분류 정보 */}
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            분류: {getSafetyCategoryName(safetyData.largeCategory, safetyData.mediumCategory)}
          </Typography>
        </Box>
        
        {/* 상세 설명 */}
        {safetyData.description && (
          <Box mb={2} p={2} bgcolor="background.default" borderRadius={1}>
            <Typography variant="body1">
              {safetyData.description}
            </Typography>
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* 상세 정보 표 */}
        <Table size="small">
          <TableBody>
            {/* 위치 정보 */}
            <TableRow>
              <TableCell width="30%" sx={{ borderBottom: 'none' }}>
                <Box display="flex" alignItems="center">
                  <LocationIcon fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2" fontWeight="medium">위치</Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ borderBottom: 'none' }}>
                <Typography variant="body2">
                  {safetyData.addressRoad || safetyData.addressJibun || '상세 주소 정보 없음'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`(${safetyData.latitude.toFixed(6)}, ${safetyData.longitude.toFixed(6)})`}
                </Typography>
              </TableCell>
            </TableRow>
            
            {/* 데이터 기준일 */}
            {safetyData.reportDate && (
              <TableRow>
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Box display="flex" alignItems="center">
                    <CalendarIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="medium">기준일자</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Typography variant="body2">{safetyData.reportDate}</Typography>
                </TableCell>
              </TableRow>
            )}
            
            {/* 도로 정보 */}
            {(safetyData.roadLength || safetyData.roadCount || safetyData.roadWidth) && (
              <TableRow>
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Box display="flex" alignItems="center">
                    <InfoIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="medium">도로 정보</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Typography variant="body2">
                    {safetyData.vulnerableType && `${safetyData.vulnerableType}, `}
                    {safetyData.roadLength && `길이: ${safetyData.roadLength}m, `}
                    {safetyData.roadCount && `차로 수: ${safetyData.roadCount}차로, `}
                    {safetyData.roadWidth && `차로폭: ${safetyData.roadWidth}m`}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            
            {/* 주변 시설 정보 */}
            {(safetyData.hospitalInfo || safetyData.policeInfo || safetyData.fireStationInfo || safetyData.nearestIc) && (
              <TableRow>
                <TableCell sx={{ borderBottom: 'none', verticalAlign: 'top' }}>
                  <Box display="flex" alignItems="center">
                    <InfoIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="medium">주변 시설</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none' }}>
                  {safetyData.hospitalInfo && (
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <HospitalIcon fontSize="small" sx={{ mr: 1, color: '#d81b60' }} />
                      <Typography variant="body2">{safetyData.hospitalInfo}</Typography>
                    </Box>
                  )}
                  
                  {safetyData.policeInfo && (
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <PoliceIcon fontSize="small" sx={{ mr: 1, color: '#1565c0' }} />
                      <Typography variant="body2">{safetyData.policeInfo}</Typography>
                    </Box>
                  )}
                  
                  {safetyData.fireStationInfo && (
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <FireStationIcon fontSize="small" sx={{ mr: 1, color: '#d32f2f' }} />
                      <Typography variant="body2">{safetyData.fireStationInfo}</Typography>
                    </Box>
                  )}
                  
                  {safetyData.nearestIc && (
                    <Box display="flex" alignItems="center">
                      <LocationIcon fontSize="small" sx={{ mr: 1, color: '#00897b' }} />
                      <Typography variant="body2">인접IC: {safetyData.nearestIc}</Typography>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          데이터 제공: 경찰청
        </Typography>
        <Button onClick={onClose} color="primary">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SafetyInfoViewer;