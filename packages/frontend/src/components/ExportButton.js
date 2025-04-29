import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef } from 'react';
/**
 * 데이터 내보내기 버튼 컴포넌트
 */
const ExportButton = ({ onExport, data, filename = 'export', className = '', label = '내보내기', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    // 드롭다운 토글
    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };
    // 외부 클릭 감지
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    // CSV 내보내기 함수
    const exportToCSV = () => {
        try {
            // 실제 내보내기 코드는 구현이 필요합니다.
            onExport('csv');
            setIsOpen(false);
        }
        catch (error) {
            console.error('CSV 내보내기 실패:', error);
        }
    };
    // Excel 내보내기 함수
    const exportToExcel = () => {
        try {
            // 실제 내보내기 코드는 구현이 필요합니다.
            onExport('excel');
            setIsOpen(false);
        }
        catch (error) {
            console.error('Excel 내보내기 실패:', error);
        }
    };
    // PDF 내보내기 함수
    const exportToPDF = () => {
        try {
            // 실제 내보내기 코드는 구현이 필요합니다.
            onExport('pdf');
            setIsOpen(false);
        }
        catch (error) {
            console.error('PDF 내보내기 실패:', error);
        }
    };
    return (_jsxs("div", { className: `relative inline-block text-left ${className}`, ref: dropdownRef, children: [_jsxs("button", { type: "button", disabled: disabled, onClick: toggleDropdown, className: `inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`, children: [label, _jsx("svg", { className: "-mr-1 ml-2 h-5 w-5", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { fillRule: "evenodd", d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd" }) })] }), isOpen && (_jsx("div", { className: "origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10", children: _jsxs("div", { className: "py-1", role: "menu", "aria-orientation": "vertical", "aria-labelledby": "export-button", children: [_jsx("button", { className: "w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900", role: "menuitem", onClick: exportToCSV, children: "CSV \uD30C\uC77C" }), _jsx("button", { className: "w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900", role: "menuitem", onClick: exportToExcel, children: "Excel \uD30C\uC77C" }), _jsx("button", { className: "w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900", role: "menuitem", onClick: exportToPDF, children: "PDF \uD30C\uC77C" })] }) }))] }));
};
export default ExportButton;
