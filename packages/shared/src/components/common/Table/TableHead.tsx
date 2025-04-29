import React from 'react';
import { TableColumn, SortingState } from './types';
import TableSortHeader from './TableSortHeader';

interface TableHeadProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  sortable?: boolean;
  currentSorting?: SortingState | null;
  onSortingChange?: (sorting: SortingState) => void;
}

const TableHead = <T extends Record<string, unknown>>({
  columns,
  sortable,
  currentSorting,
  onSortingChange,
}: TableHeadProps<T>) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        {columns.map((column) => {
          // 정렬에 따른 클래스 계산
          const alignClass = column.align === 'center' 
            ? 'text-center' 
            : column.align === 'right' 
              ? 'text-right' 
              : 'text-left';
          
          return (
            <th
              key={column.id}
              scope="col"
              className={`
                px-6 
                py-3 
                ${alignClass}
                text-xs 
                font-medium 
                text-gray-500 
                uppercase 
                tracking-wider
              `}
              style={{ width: column.width }}
            >
              {sortable && column.sortable ? (
                <TableSortHeader
                  column={column}
                  currentSorting={currentSorting}
                  onSortingChange={onSortingChange}
                >
                  {column.header}
                </TableSortHeader>
              ) : (
                column.header
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export default TableHead;