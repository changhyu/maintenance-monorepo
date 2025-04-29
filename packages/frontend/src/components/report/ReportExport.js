import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Select, message } from 'antd';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
const { Option } = Select;
/**
 * HTML 요소를 이미지 데이터 URL로 변환
 * @param element HTML 요소
 * @returns 이미지 데이터 URL을 반환하는 Promise
 */
const htmlToImage = async (element) => {
    if (!element) {
        throw new Error('유효한 HTML 요소가 제공되지 않았습니다');
    }
    
    try {
        // 요소를 이미지로 변환 (PNG 형식)
        const dataUrl = await toPng(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 2, // 고해상도 이미지를 위한 설정
            quality: 0.8
        });
        
        return dataUrl;
    } catch (error) {
        console.error('HTML 요소를 이미지로 변환 중 오류 발생:', error);
        throw error;
    }
};
/**
 * 보고서 내보내기 컴포넌트
 * PDF, Excel 형식으로 보고서를 내보낼 수 있는 기능 제공
 */
const ReportExport = ({ reportData, title = '보고서', includeCharts = false, chartElements = [] }) => {
    const [exportType, setExportType] = useState('pdf');
    const [isLoading, setIsLoading] = useState(false);
    const handleExport = () => {
        if (exportType === 'pdf') {
            exportToPDF();
        }
        else if (exportType === 'excel') {
            exportToExcel();
        }
    };
    /**
     * 데이터를 PDF로 내보내는 함수
     */
    const exportToPDF = async () => {
        try {
            setIsLoading(true);
            const doc = new jsPDF();
            // 문서 정보 설정
            doc.setProperties({
                title: title,
                subject: '차량 관리 시스템 보고서',
                author: '차량 관리 시스템',
                keywords: '차량, 정비, 보고서',
                creator: '차량 관리 시스템'
            });
            // 제목 추가
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            // 날짜 추가
            doc.setFontSize(12);
            doc.text(`생성일: ${new Date().toLocaleDateString()}`, 14, 30);
            // 데이터 유형 확인 (객체 배열 또는 단일 객체)
            const dataArray = Array.isArray(reportData) ? reportData : [reportData];
            // 데이터가 비어있는 경우 처리
            if (dataArray.length === 0) {
                doc.text('데이터가 없습니다.', 14, 40);
                doc.save(`${title}.pdf`);
                message.success('PDF 보고서가 생성되었습니다.');
                setIsLoading(false);
                return;
            }
            // 표 헤더 생성
            const headers = Object.keys(dataArray[0]).filter(key => 
            // 복잡한 객체나 배열 필드 제외
            typeof dataArray[0][key] !== 'object' || dataArray[0][key] === null);
            // 표 데이터 생성
            const rows = dataArray.map(item => headers.map(key => {
                const value = item[key];
                // 값이 null 또는 undefined인 경우 빈 문자열 반환
                if (value === null || value === undefined)
                    return '';
                // 날짜 형식 변환
                if (value instanceof Date)
                    return value.toLocaleDateString();
                // 객체인 경우 JSON 문자열로 변환
                if (typeof value === 'object')
                    return JSON.stringify(value);
                return String(value);
            }));
            // 표 생성
            doc.autoTable({
                head: [headers.map(header => {
                        // 헤더 텍스트 가공 (카멜케이스 -> 공백으로 구분, 첫 글자 대문자)
                        return header
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase());
                    })],
                body: rows,
                startY: 40,
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                    lineColor: [44, 62, 80],
                    lineWidth: 0.25,
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]
                },
                margin: { top: 40 }
            });
            // 차트 포함 
            if (includeCharts) {
                // 차트 요소가 제공된 경우
                if (chartElements.length > 0) {
                    doc.addPage();
                    doc.setFontSize(16);
                    doc.text("차트 및 그래프", 14, 20);
                    let yPosition = 30;
                    // 각 차트 요소를 이미지로 변환하여 PDF에 추가
                    for (let i = 0; i < chartElements.length; i++) {
                        try {
                            // 차트 요소를 이미지로 변환
                            const imageData = await htmlToImage(chartElements[i]);
                            // 이미지 크기 조정
                            const imgWidth = 180;
                            const imgHeight = 100;
                            // 이미지 추가
                            doc.addImage(imageData, 'PNG', 14, yPosition, imgWidth, imgHeight);
                            // 다음 이미지 위치 조정
                            yPosition += imgHeight + 20;
                            // 페이지 넘김 처리
                            if (yPosition > 250 && i < chartElements.length - 1) {
                                doc.addPage();
                                yPosition = 20;
                            }
                        }
                        catch (error) {
                            console.error(`차트 이미지 변환 오류 (차트 ${i + 1}):`, error);
                        }
                    }
                }
                else {
                    // 차트 요소가 없는 경우 데모 차트 생성
                    doc.addPage();
                    doc.setFontSize(16);
                    doc.text("차트 페이지", 14, 20);
                    doc.setFontSize(12);
                    doc.text("차트를 포함하려면 chartElements 속성을 통해 DOM 요소를 전달하세요.", 14, 30);
                    // 데모 차트 생성 (임의의 막대 차트)
                    const canvas = document.createElement('canvas');
                    canvas.width = 500;
                    canvas.height = 300;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // 배경
                        ctx.fillStyle = '#f5f5f5';
                        ctx.fillRect(0, 0, 500, 300);
                        // 막대 차트
                        const barData = [120, 80, 150, 90, 60];
                        const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#5F6368'];
                        for (let i = 0; i < barData.length; i++) {
                            ctx.fillStyle = colors[i];
                            ctx.fillRect(50 + i * 90, 250 - barData[i], 70, barData[i]);
                            ctx.fillStyle = '#333';
                            ctx.font = '12px Arial';
                            ctx.fillText(`항목 ${i + 1}`, 60 + i * 90, 270);
                        }
                        // 제목
                        ctx.fillStyle = '#333';
                        ctx.font = 'bold 14px Arial';
                        ctx.fillText('샘플 데이터 차트', 180, 30);
                        // 이미지 추가
                        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 40, 180, 100);
                    }
                }
            }
            // PDF 저장
            doc.save(`${title}.pdf`);
            message.success('PDF 보고서가 생성되었습니다.');
        }
        catch (error) {
            console.error('PDF 내보내기 오류:', error);
            message.error('PDF 내보내기 오류 발생');
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * 데이터를 Excel로 내보내는 함수 (ExcelJS 사용)
     */
    const exportToExcel = async () => {
        try {
            setIsLoading(true);
            // 데이터 유형 확인 (객체 배열 또는 단일 객체)
            const dataArray = Array.isArray(reportData) ? reportData : [reportData];
            
            // 워크북 생성
            const workbook = new ExcelJS.Workbook();
            workbook.creator = '차량 관리 시스템';
            workbook.lastModifiedBy = '차량 관리 시스템';
            workbook.created = new Date();
            workbook.modified = new Date();
            
            // 워크시트 추가
            const worksheet = workbook.addWorksheet(title.substring(0, 31));
            
            if (dataArray.length === 0) {
                worksheet.addRow(['데이터가 없습니다.']);
            } else {
                // 헤더 추출
                const headers = Object.keys(dataArray[0]).filter(key => 
                    // 복잡한 객체나 배열 필드 제외
                    typeof dataArray[0][key] !== 'object' || dataArray[0][key] === null);
                
                // 헤더 행 추가
                const headerRow = worksheet.addRow(headers.map(header => {
                    // 헤더 텍스트 가공 (카멜케이스 -> 공백으로 구분, 첫 글자 대문자)
                    return header
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase());
                }));
                
                // 헤더 스타일링
                headerRow.eachCell((cell) => {
                    cell.font = { bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: '2980B9' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
                
                // 데이터 행 추가
                dataArray.forEach((item, rowIndex) => {
                    const rowData = headers.map(key => {
                        const value = item[key];
                        
                        // 값이 null 또는 undefined인 경우 빈 문자열 반환
                        if (value === null || value === undefined)
                            return '';
                        
                        // 날짜 형식 변환
                        if (value instanceof Date)
                            return value.toLocaleDateString();
                        
                        // 객체인 경우 JSON 문자열로 변환
                        if (typeof value === 'object')
                            return JSON.stringify(value);
                        
                        return String(value);
                    });
                    
                    const row = worksheet.addRow(rowData);
                    
                    // 행 스타일링 (짝수/홀수 행 구분)
                    if (rowIndex % 2 === 1) {
                        row.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'F0F0F0' }
                            };
                        });
                    }
                    
                    // 테두리 추가
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
                
                // 열 너비 자동 조정
                worksheet.columns.forEach(column => {
                    let maxLength = 0;
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                    column.width = Math.min(maxLength + 2, 30);
                });
            }
            
            // 차트 추가 (includeCharts가 true이고 차트 요소가 있는 경우)
            if (includeCharts && chartElements.length > 0) {
                // 차트 워크시트 추가
                const chartSheet = workbook.addWorksheet('차트');
                
                // 차트 시트에 제목 추가
                chartSheet.addRow(['차트 및 그래프']);
                chartSheet.getCell('A1').font = { size: 14, bold: true };
                chartSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
                chartSheet.mergeCells('A1:E1');
                
                // 현재 위치 (행) 설정
                let currentRow = 3;
                
                // 각 차트 요소에 대해 이미지 추가
                for (let i = 0; i < chartElements.length; i++) {
                    try {
                        // 차트 요소를 이미지로 변환
                        const imageData = await htmlToImage(chartElements[i]);
                        
                        // 이미지 데이터에서 Base64 부분만 추출 (data:image/png;base64, 제거)
                        const base64Data = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                        
                        // 차트 제목 추가
                        const chartTitle = `차트 ${i + 1}`;
                        chartSheet.addRow([chartTitle]);
                        chartSheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
                        currentRow++;
                        
                        // 이미지 추가
                        const imageId = workbook.addImage({
                            base64: base64Data,
                            extension: 'png',
                        });
                        
                        // 이미지 삽입 (Excel에서 잘 표시되도록 적절한 크기 설정)
                        chartSheet.addImage(imageId, {
                            tl: { col: 0, row: currentRow },
                            ext: { width: 500, height: 300 }
                        });
                        
                        // 이미지 아래 여백 추가
                        currentRow += 16; // 이미지 영역을 위한 여백 (약 16행 정도)
                        chartSheet.addRow([]);
                        currentRow++;
                    } catch (error) {
                        console.error(`차트 이미지 변환 오류 (차트 ${i + 1}):`, error);
                        // 오류 메시지 추가
                        chartSheet.addRow([`차트 ${i + 1} 처리 중 오류 발생`]);
                        currentRow++;
                    }
                }
                
                // 열 너비 설정
                chartSheet.getColumn('A').width = 15;
                chartSheet.getColumn('B').width = 15;
                chartSheet.getColumn('C').width = 15;
                chartSheet.getColumn('D').width = 15;
                chartSheet.getColumn('E').width = 15;
            }
            
            // 엑셀 파일 생성 및 저장
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${title}.xlsx`);
            
            message.success('Excel 보고서가 생성되었습니다.');
        } catch (error) {
            console.error('Excel 내보내기 오류:', error);
            message.error('Excel 내보내기 오류 발생');
        } finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { style: { margin: '20px 0' }, children: [_jsxs(Select, { value: exportType, onChange: (value) => setExportType(value), style: { width: 120, marginRight: 10 }, disabled: isLoading, children: [_jsx(Option, { value: "pdf", children: "PDF" }), _jsx(Option, { value: "excel", children: "Excel" })] }), _jsx(Button, { type: "primary", onClick: handleExport, loading: isLoading, disabled: isLoading, children: isLoading ? '내보내는 중...' : '보고서 내보내기' })] }));
};
export default ReportExport;
