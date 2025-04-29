import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { exportData } from '../../utils/exportUtils';
/**
 * 데이터를 여러 형식(CSV, Excel, PDF)으로 내보낼 수 있는 드롭다운 버튼
 */
const ExportButton = ({ data, filename, label = '내보내기', disabled = false, formats = ['csv', 'excel', 'pdf'], color = 'primary', size = 'medium', tooltip = '데이터 내보내기', emptyDataMessage = '내보낼 데이터가 없습니다', onExportComplete }) => {
    // 드롭다운 메뉴 상태 관리
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    // 버튼 참조 (외부 클릭 감지용)
    const buttonRef = useRef(null);
    // 내보내기 형식 표시 이름 매핑
    const formatLabels = {
        csv: 'CSV',
        excel: 'Excel',
        pdf: 'PDF'
    };
    // 데이터 유효성 확인
    const isDataEmpty = !data || (Array.isArray(data) && data.length === 0);
    // 드롭다운 메뉴 열기
    const handleClick = (event) => {
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
    const handleExport = (format) => {
        try {
            exportData(Array.isArray(data) ? data : Object.values(data), filename, format);
            if (onExportComplete) {
                onExportComplete(format);
            }
        }
        catch (error) {
            console.error('내보내기 중 오류 발생:', error);
        }
        handleClose();
    };
    // 외부 클릭 시 드롭다운 메뉴 닫기
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target) && open) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [open]);
    return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: tooltip, children: _jsx("span", { children: _jsx(Button, { ref: buttonRef, variant: "contained", color: color, size: size, disabled: disabled, startIcon: _jsx(FileDownloadIcon, {}), endIcon: _jsx(ArrowDropDownIcon, {}), onClick: handleClick, "aria-haspopup": "true", "aria-expanded": open ? 'true' : undefined, children: label }) }) }), _jsx(Menu, { anchorEl: anchorEl, open: open, onClose: handleClose, anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'right'
                }, transformOrigin: {
                    vertical: 'top',
                    horizontal: 'right'
                }, children: formats.map(format => (_jsx(MenuItem, { onClick: () => handleExport(format), children: formatLabels[format] }, format))) })] }));
};
export default ExportButton;
