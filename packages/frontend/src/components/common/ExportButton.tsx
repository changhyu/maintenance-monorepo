import React, { useState, useRef, useEffect } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { ExportFormat, exportData } from '../../utils/exportUtils';

/**
 * ExportButton 컴포넌트의 속성 정의
 */
export interface ExportButtonProps {
  /** 내보낼 데이터 (객체 배열) */
  data: any[] | Record<string, any>;
  /** 내보낼 파일의 기본 이름 (확장자 제외) */
  filename: string;
  /** 버튼에 표시할 텍스트 */
  label?: string;
  /** 버튼 비활성화 여부 */
  disabled?: boolean;
  /** 지원하는 내보내기 형식 */
  formats?: ExportFormat[];
  /** 버튼 색상 */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  /** 버튼 크기 */
  size?: 'small' | 'medium' | 'large';
  /** 버튼에 표시할 툴팁 */
  tooltip?: string;
  /** 데이터가 비어있을 때 표시할 텍스트 */
  emptyDataMessage?: string;
  /** 내보내기 완료 후 호출될 콜백 함수 */
  onExportComplete?: (format: ExportFormat) => void;
}

/**
 * 데이터를 여러 형식(CSV, Excel, PDF)으로 내보낼 수 있는 드롭다운 버튼
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  label = '내보내기',
  disabled = false,
  formats = ['csv', 'excel', 'pdf'],
  color = 'primary',
  size = 'medium',
  tooltip = '데이터 내보내기',
  emptyDataMessage = '내보낼 데이터가 없습니다',
  onExportComplete,
}) => {
  // 드롭다운 메뉴 상태 관리
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // 버튼 참조 (외부 클릭 감지용)
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // 내보내기 형식 표시 이름 매핑
  const formatLabels: Record<ExportFormat, string> = {
    csv: 'CSV',
    excel: 'Excel',
    pdf: 'PDF',
  };
  
  // 데이터 유효성 확인
  const isDataEmpty = !data || (Array.isArray(data) && data.length === 0);
  
  // 드롭다운 메뉴 열기
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDataEmpty) {
      alert(emptyDataMessage);
      return;
    }
    setAnchorEl(event.currentTarget);
  };
  
  // 드롭다운 메뉴 닫기
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // 선택한 형식으로 내보내기
  const handleExport = (format: ExportFormat) => {
    try {
      exportData(data, filename, format);
      if (onExportComplete) {
        onExportComplete(format);
      }
    } catch (error) {
      console.error('내보내기 중 오류 발생:', error);
    }
    handleClose();
  };
  
  // 외부 클릭 시 드롭다운 메뉴 닫기
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) && 
        open
      ) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);
  
  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <Button
            ref={buttonRef}
            variant="contained"
            color={color}
            size={size}
            disabled={disabled}
            startIcon={<FileDownloadIcon />}
            endIcon={<ArrowDropDownIcon />}
            onClick={handleClick}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            {label}
          </Button>
        </span>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {formats.map((format) => (
          <MenuItem key={format} onClick={() => handleExport(format)}>
            {formatLabels[format]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ExportButton; 