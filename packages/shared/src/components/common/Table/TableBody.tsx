import React from 'react';
import { TableColumn } from './types';
import TableRow from './TableRow';

interface TableBodyProps<T = Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  isLoading: boolean;
  onRowClick?: (row: T) => void;
  striped?: boolean;
  hoverable?: boolean;
}

const TableBody = <T extends Record<string, unknown>>({
  data,
  columns,
  isLoading,
  onRowClick,
  striped,
  hoverable,
}: TableBodyProps<T>) => {
  if (isLoading) {
    return (
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td
            colSpan={columns.length}
            className="px-6 py-4 text-center text-sm text-gray-500"
          >
            데이터 로딩 중...
          </td>
        </tr>
      </tbody>
    );
  }
  
  if (data.length === 0) {
    return (
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td
            colSpan={columns.length}
            className="px-6 py-4 text-center text-sm text-gray-500"
          >
            데이터가 없습니다.
          </td>
        </tr>
      </tbody>
    );
  }
  
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((row, rowIndex) => (
        <TableRow
          key={rowIndex}
          row={row}
          columns={columns}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          isStriped={striped && rowIndex % 2 === 1}
          isHoverable={hoverable}
        />
      ))}
    </tbody>
  );
};

export default TableBody;