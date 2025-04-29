import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  IconButton,
  CardActionArea,
  CardActions,
  Tooltip,
  Grid,
  Divider
} from '@mui/material';
import { MaintenanceRecord } from '../../types/maintenance';
import MaintenanceStatusBadge from './MaintenanceStatusBadge';
import MaintenancePriorityBadge from './MaintenancePriorityBadge';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface MaintenanceCardProps {
  maintenance: MaintenanceRecord;
  onEdit?: (maintenance: MaintenanceRecord) => void;
  onDelete?: (maintenance: MaintenanceRecord) => void;
  onComplete?: (maintenance: MaintenanceRecord) => void;
}

/**
 * 정비 작업 정보를 카드 형태로 표시하는 컴포넌트
 */
const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  maintenance,
  onEdit,
  onDelete,
  onComplete
}) => {
  const navigate = useNavigate();

  // 정비 상세 정보 페이지로 이동
  const handleClick = () => {
    navigate(`/maintenance/${maintenance.id}`);
  };

  // 정비 유형에 따른 텍스트 매핑
  const getMaintenanceTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      'regular': '정기 점검',
      'repair': '수리',
      'inspection': '검사',
      'replacement': '부품 교체',
      'emergency': '긴급 정비',
      'upgrade': '업그레이드',
      'recall': '리콜',
      'other': '기타'
    };
    return typeMap[type] || type;
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={handleClick} sx={{ flexGrow: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" component="div" gutterBottom>
                {maintenance.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {maintenance.vehicle?.name || '차량 정보 없음'} - {maintenance.vehicle?.licensePlate || '번호판 정보 없음'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <MaintenanceStatusBadge status={maintenance.status} />
              <MaintenancePriorityBadge priority={maintenance.priority} size="small" />
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                정비 유형:
              </Typography>
              <Typography variant="body2">
                {getMaintenanceTypeText(maintenance.type)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                담당자:
              </Typography>
              <Typography variant="body2">
                {maintenance.assignedTo || '-'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                예정일:
              </Typography>
              <Typography variant="body2">
                {formatDate(maintenance.scheduledDate)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                예상 비용:
              </Typography>
              <Typography variant="body2">
                {maintenance.estimatedCost ? `${maintenance.estimatedCost.toLocaleString()}원` : '-'}
              </Typography>
            </Grid>
          </Grid>

          {maintenance.description && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                설명:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {maintenance.description}
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>

      <CardActions disableSpacing>
        {onComplete && maintenance.status !== 'completed' && (
          <Tooltip title="완료 처리">
            <IconButton 
              aria-label="complete" 
              onClick={(e) => {
                e.stopPropagation();
                onComplete(maintenance);
              }}
              color="success"
            >
              <CheckCircleIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Box sx={{ display: 'flex', ml: 'auto' }}>
          {onEdit && (
            <Tooltip title="수정">
              <IconButton 
                aria-label="edit" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(maintenance);
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {onDelete && (
            <Tooltip title="삭제">
              <IconButton 
                aria-label="delete" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(maintenance);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default MaintenanceCard;