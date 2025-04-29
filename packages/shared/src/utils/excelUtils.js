import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
/**
 * Excel 파일 생성 및 다운로드를 위한 유틸리티 함수
 */
/**
 * ExcelJS를 사용하여 데이터를 Excel 파일로 내보내기
 * @param data 내보낼 데이터 배열
 * @param headers 열 헤더 정보
 * @param filename 저장할 파일명
 */
export async function exportToExcel(data, headers, filename) {
    // 1. 새 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    // 2. 열 정의 설정
    worksheet.columns = headers.map(h => ({
        key: h.key,
        header: h.header,
        width: 20 // 기본 너비 설정
    }));
    // 3. 데이터 추가
    worksheet.addRows(data);
    // 4. 스타일 적용
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' } // 연한 파란색 배경
    };
    // 테두리 스타일 적용
    worksheet.eachRow((row, _rowNumber) => {
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });
    // 5. 엑셀 파일을 Blob으로 변환
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    // 6. 파일 저장
    saveAs(blob, filename);
}
/**
 * ExcelJS를 사용하여 Excel 파일 읽기
 * @param file 읽을 Excel 파일
 * @returns 워크시트의 데이터를 JSON 객체 배열로 반환
 */
export async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!e.target?.result) {
                    throw new Error('파일을 읽는 중 오류가 발생했습니다.');
                }
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(e.target.result);
                const worksheet = workbook.worksheets[0]; // 첫 번째 워크시트 사용
                const jsonData = [];
                // 헤더 행 가져오기 (첫 번째 행)
                const headers = [];
                worksheet.getRow(1).eachCell((cell, colNumber) => {
                    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
                });
                // 데이터 행 처리 (두 번째 행부터)
                worksheet.eachRow((row, _rowNumber) => {
                    if (_rowNumber > 1) { // 헤더 행 제외
                        const rowData = {};
                        row.eachCell((cell, colNumber) => {
                            rowData[headers[colNumber - 1]] = cell.value;
                        });
                        jsonData.push(rowData);
                    }
                });
                resolve(jsonData);
            }
            catch (error) {
                reject(error instanceof Error ? error : new Error('엑셀 파일 처리 중 오류가 발생했습니다.'));
            }
        };
        reader.onerror = () => {
            reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
        };
        reader.readAsArrayBuffer(file);
    });
}
/**
 * 템플릿 기반으로 Excel 파일 생성
 * @param templateData 템플릿 데이터 (여러 시트와 데이터를 포함할 수 있음)
 * @param filename 저장할 파일명
 */
export async function generateExcelFromTemplate(templateData, filename) {
    // 워크북 생성
    const workbook = new ExcelJS.Workbook();
    // 각 템플릿 시트 처리
    for (const sheet of templateData) {
        const worksheet = workbook.addWorksheet(sheet.sheetName);
        // 열 설정
        worksheet.columns = sheet.headers.map(h => ({
            key: h.key,
            header: h.header,
            width: h.width || 20
        }));
        // 데이터 추가
        worksheet.addRows(sheet.data);
        // 스타일 적용
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F0FF' }
        };
        // 모든 셀에 테두리 추가
        worksheet.eachRow((row, _rowNumber) => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    }
    // 엑셀 파일 생성 및 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, filename);
}
