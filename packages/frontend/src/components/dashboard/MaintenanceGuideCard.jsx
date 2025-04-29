import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Typography, 
  Box,
  Grid,
  IconButton,
  Chip,
  Divider,
  Button
} from '@mui/material';
import {
  Build as BuildIcon,
  LocalGasStation as GasIcon,
  AcUnit as AcUnitIcon,
  Speed as SpeedIcon,
  BatteryChargingFull as BatteryIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

// 정비 팁 항목 컴포넌트
const MaintenanceTip = ({ icon, title, description, category }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box
          sx={{
            backgroundColor: 'primary.light',
            color: 'primary.main',
            borderRadius: '50%',
            p: 1,
            mr: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
            {title}
          </Typography>
          <Box>
            <Chip 
              label={category} 
              size="small" 
              color="secondary" 
              variant="outlined"
            />
          </Box>
        </Box>
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ ml: 6 }}>
        {description}
      </Typography>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};

// 정비 가이드 카드
const MaintenanceGuideCard = () => {
  // 정비 팁 데이터
  const maintenanceTips = [
    {
      icon: <GasIcon />,
      title: '올바른 연료 주입 시기',
      description: '연료는 탱크의 1/4 이하로 떨어지기 전에 주입하는 것이 좋습니다. 연료가 너무 적으면 연료 펌프가 과열되어 손상될 수 있습니다.',
      category: '연료 관리'
    },
    {
      icon: <SpeedIcon />,
      title: '타이어 공기압 정기 점검',
      description: '타이어 공기압은 한 달에 한 번 이상 점검하고, 계절이 바뀌거나 장거리 운전 전에 확인하세요. 적정 공기압은 연비와 타이어 수명을 향상시킵니다.',
      category: '타이어 관리'
    },
    {
      icon: <BatteryIcon />,
      title: '배터리 터미널 청소',
      description: '배터리 터미널에 부식이 생기면 시동 문제가 발생할 수 있습니다. 베이킹 소다와 물을 1:1로 섞은 용액으로 주기적으로 닦아주세요.',
      category: '전기 시스템'
    },
    {
      icon: <BuildIcon />,
      title: '엔진 오일 교체 주기',
      description: '일반적으로 엔진 오일은 5,000km ~ 10,000km 주행 후 또는 6개월마다 교체하는 것이 좋습니다. 차량 매뉴얼을 참조하세요.',
      category: '정기 점검'
    },
    {
      icon: <AcUnitIcon />,
      title: '에어컨 필터 교체',
      description: '에어컨 필터는 1년에 한 번 또는 15,000km 주행 후 교체하는 것이 좋습니다. 필터가 더러우면 실내 공기 질이 나빠지고 에어컨 효율이 감소합니다.',
      category: '내부 관리'
    }
  ];
  
  return (
    <Card>
      <CardHeader 
        title="차량 정비 가이드 & 팁" 
        action={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            {maintenanceTips.map((tip, index) => (
              <MaintenanceTip 
                key={index}
                icon={tip.icon}
                title={tip.title}
                description={tip.description}
                category={tip.category}
              />
            ))}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<BuildIcon />}
              >
                모든 정비 가이드 보기
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box 
              sx={{ 
                backgroundColor: 'info.light', 
                p: 2, 
                borderRadius: 1,
                color: 'info.contrastText'
              }}
            >
              <Typography variant="h6" gutterBottom>
                정비 일정 관리의 중요성
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                정기적인 차량 점검 및 정비는 안전한 운행과 차량의 수명 연장에 매우 중요합니다.
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                제조사 권장 정비 주기를 따르면 예상치 못한 고장과 비용을 줄일 수 있습니다.
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                우리 서비스를 통해 맞춤형 정비 알림을 받아보세요!
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                mt: 3,
                backgroundColor: 'warning.light', 
                p: 2, 
                borderRadius: 1,
                color: 'warning.contrastText'
              }}
            >
              <Typography variant="h6" gutterBottom>
                계절별 차량 관리 포인트
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                현재 계절: 가을
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • 냉각수 및 부동액 레벨 확인
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • 배터리 상태 점검
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • 와이퍼 블레이드 점검 및 교체
              </Typography>
              <Typography variant="body2">
                • 타이어 공기압 및 마모도 확인
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default MaintenanceGuideCard;