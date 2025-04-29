import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Button,
  Chip,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { CCTVData } from '../services/uticService';

interface CCTVViewerProps {
  cctv: CCTVData | null;
  onClose: () => void;
}

/**
 * CCTV 영상 뷰어 컴포넌트
 * 
 * CCTV 데이터를 받아 타입에 따라 다른 방식으로 영상 표시:
 * - 타입 1: HLS 스트리밍
 * - 타입 2: MP4 비디오 파일
 * - 타입 3: 정지 이미지(JPG)
 */
const CCTVViewer: React.FC<CCTVViewerProps> = ({ cctv, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 타입에 맞는 미디어 컴포넌트 렌더링
  const renderMedia = () => {
    if (!cctv) return null;
    
    const handleMediaLoad = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleMediaError = () => {
      setIsLoading(false);
      setError('영상 로딩에 실패했습니다. 잠시 후 다시 시도해주세요.');
    };
    
    // URL 유효성 확인 (빈 URL이면 에러)
    if (!cctv.url) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          CCTV URL이 제공되지 않았습니다.
        </Alert>
      );
    }

    // CCTV 타입에 따라 다른 미디어 컴포넌트 반환
    switch (cctv.type) {
      // 타입 1: 실시간 스트리밍 (HLS)
      case '1':
        // 타입 1은 HLS 스트리밍을 위해 video 태그 사용
        return (
          <video
            ref={videoRef}
            controls
            autoPlay
            muted
            playsInline
            width="100%"
            height="auto"
            style={{ maxHeight: '70vh' }}
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
            key={lastRefresh.getTime()}
          >
            <source src={cctv.url} type={cctv.format || 'application/x-mpegURL'} />
            브라우저가 비디오 태그를 지원하지 않습니다.
          </video>
        );
      
      // 타입 2: 동영상 파일
      case '2':
        // 타입 2는 MP4 등의 동영상 파일을 재생
        return (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            width="100%"
            height="auto"
            style={{ maxHeight: '70vh' }}
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
            key={lastRefresh.getTime()}
          >
            <source src={cctv.url} type={cctv.format || 'video/mp4'} />
            브라우저가 비디오 태그를 지원하지 않습니다.
          </video>
        );
      
      // 타입 3: 정지 영상 (이미지)
      case '3':
        // 타입 3은 정적 이미지로, img 태그 사용
        return (
          <img
            src={`${cctv.url}?timestamp=${lastRefresh.getTime()}`} // 캐시 방지를 위한 타임스탬프 추가
            alt={cctv.name || 'CCTV 영상'}
            style={{ 
              width: '100%', 
              maxHeight: '70vh',
              objectFit: 'contain' 
            }}
            onLoad={handleMediaLoad}
            onError={handleMediaError}
          />
        );
      
      // 기본값: 알 수 없는 타입
      default:
        return (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body1">
              지원되지 않는 CCTV 타입입니다. (타입: {cctv.type})
            </Typography>
          </Alert>
        );
    }
  };
  
  // 풀스크린 토글
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error('Fullscreen error:', err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error('Exit fullscreen error:', err));
      }
    }
  };
  
  // 새로고침 처리
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setLastRefresh(new Date());
  };
  
  // 풀스크린 상태 변화 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Dialog가 열릴 때마다 상태 초기화
  useEffect(() => {
    if (cctv) {
      setIsLoading(true);
      setError(null);
      setLastRefresh(new Date());
    }
  }, [cctv]);
  
  // CCTV 타입 텍스트 반환
  const getCctvTypeText = (): string => {
    if (!cctv) return '';
    
    switch (cctv.type) {
      case '1':
        return '실시간 스트리밍';
      case '2':
        return '동영상 파일';
      case '3':
        return '정지 영상';
      default:
        return '알 수 없는 타입';
    }
  };

  // Dialog 열려있는지 확인
  const isOpen = Boolean(cctv);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      {isOpen && (
        <>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="div">
                {cctv?.name || 'CCTV 영상'}
              </Typography>
              
              <Chip 
                label={getCctvTypeText()} 
                size="small" 
                color={cctv?.type === '1' ? 'success' : 'default'}
                sx={{ ml: 1 }}
              />
              
              {cctv?.resolution && (
                <Tooltip title="해상도">
                  <Chip 
                    label={cctv.resolution} 
                    size="small" 
                    variant="outlined" 
                    sx={{ ml: 1 }}
                  />
                </Tooltip>
              )}
            </Box>
            
            <Box>
              <Tooltip title="새로고침">
                <IconButton onClick={handleRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title={isFullscreen ? "전체화면 종료" : "전체화면"}>
                <IconButton onClick={toggleFullscreen} color="primary">
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="닫기">
                <IconButton onClick={onClose} color="default">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }} ref={containerRef}>
            <Box 
              sx={{ 
                position: 'relative',
                width: '100%',
                minHeight: '300px',
                bgcolor: 'black',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {/* 로딩 상태 표시 */}
              {isLoading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  zIndex: 1
                }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              
              {/* 미디어 플레이어 (CCTV 타입에 따라 다름) */}
              {renderMedia()}
              
              {/* 에러 메시지 */}
              {error && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  zIndex: 2,
                  p: 3
                }}>
                  <WarningIcon fontSize="large" color="error" sx={{ mb: 2 }} />
                  <Typography variant="body1" align="center" gutterBottom>
                    {error}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />} 
                    onClick={handleRefresh}
                    color="primary"
                    sx={{ mt: 2 }}
                  >
                    다시 시도
                  </Button>
                </Box>
              )}
            </Box>
            
            {/* 추가 정보 표시 영역 */}
            {cctv && (
              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                {cctv.createTime && (
                  <Typography variant="body2" color="text.secondary">
                    촬영 시간: {new Date(cctv.createTime).toLocaleString()}
                  </Typography>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  좌표: {cctv.latitude.toFixed(6)}, {cctv.longitude.toFixed(6)}
                </Typography>
              </Box>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default CCTVViewer;