import React from 'react';
import { TableColumn } from './types';
import TableCell from './TableCell';

interface TableRowProps<T = Record<string, unknown>> {
  row: T;
  columns: TableColumn<T>[];
  onClick?: () => void;
  isStriped?: boolean;
  isHoverable?: boolean;
}

const TableRow = <T extends Record<string, unknown>>({
  row,
  columns,
  onClick,
  isStriped,
  isHoverable,
}: TableRowProps<T>) => {
  // 행 클래스 계산
  const rowClasses = `
    ${isStriped ? 'bg-gray-50' : ''}
    ${isHoverable ? 'hover:bg-gray-100' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `.trim();
  
  return (
    <tr
      className={rowClasses}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {columns.map((column) => (
        <TableCell key={column.id} column={column} row={row} />
      ))}
    </tr>
  );
};

export default TableRow;