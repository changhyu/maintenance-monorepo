import React from 'react';
import { TableColumn, SortingState } from './types';

interface TableSortHeaderProps<T = Record<string, unknown>> {
  column: TableColumn<T>;
  currentSorting?: SortingState | null;
  onSortingChange?: (sorting: SortingState) => void;
  children: React.ReactNode;
}

const TableSortHeader = <T extends Record<string, unknown>>({
  column,
  currentSorting,
  onSortingChange,
  children,
}: TableSortHeaderProps<T>) => {
  // 현재 열의 정렬 방향 결정
  const isSorted = currentSorting?.id === column.id;
  const currentDirection = isSorted ? currentSorting.direction : null;
  
  // 정렬 상태 변경 핸들러
  const handleSort = () => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (currentDirection === 'asc') {
      direction = 'desc';
    } else if (currentDirection === 'desc') {
      direction = null;
    }
    
    onSortingChange?.({
      id: column.id,
      direction,
    });
  };
  
  return (
    <button
      type="button"
      onClick={handleSort}
      className="group inline-flex items-center w-full"
      aria-label={`${column.header} 기준으로 정렬`}
    >
      <span>{children}</span>
      <span className="ml-2 flex-none rounded">
        {currentDirection === 'asc' ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : currentDirection === 'desc' ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    </button>
  );
};

export default TableSortHeader;