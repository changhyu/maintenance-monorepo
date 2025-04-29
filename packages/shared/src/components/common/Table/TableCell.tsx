import React, { ReactNode } from 'react';
import { TableColumn } from './types';

interface TableCellProps<T = Record<string, unknown>> {
  column: TableColumn<T>;
  row: T;
}

const TableCell = <T extends Record<string, unknown>>({
  column,
  row,
}: TableCellProps<T>) => {
  // 셀 데이터 값 계산
  const accessor = column.accessor;
  const value = typeof accessor === 'function' ? accessor(row) : row[accessor as keyof T];
  
  // 셀 내용 렌더링
  const cellContent = column.cell ? column.cell(value, row) : value;
  
  // 정렬에 따른 클래스 계산
  const alignClass = column.align === 'center' 
    ? 'text-center' 
    : column.align === 'right' 
      ? 'text-right' 
      : 'text-left';
  
  return (
    <td
      className={`px-6 py-4 whitespace-nowrap text-sm ${alignClass}`}
    >
      {cellContent as ReactNode}
    </td>
  );
};

export default TableCell;