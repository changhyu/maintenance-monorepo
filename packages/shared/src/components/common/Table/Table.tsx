import React, { useState, useMemo } from 'react';
import { TableProps, SortingState } from './types';
import TableHead from './TableHead';
import TableBody from './TableBody';
import TablePagination from './TablePagination';

export function Table<T extends Record<string, unknown>>({
  data = [],
  columns = [],
  isLoading = false,
  onRowClick,
  className = '',
  striped = false,
  hoverable = true,
  bordered = false,
  sortable = false,
  initialSorting,
  onSortingChange,
  pagination = false,
  paginationState,
  totalCount: externalTotalCount,
  onPageChange,
  onPageSizeChange,
}: TableProps<T>) {
  // 내부 정렬 상태 관리 (외부에서 제어하지 않는 경우)
  const [internalSorting, setInternalSorting] = useState<SortingState | null>(
    initialSorting || null
  );
  
  // 실제 사용할 정렬 상태
  const currentSorting = onSortingChange ? initialSorting : internalSorting;
  
  // 정렬 핸들러
  const handleSortingChange = (newSorting: SortingState) => {
    if (onSortingChange) {
      onSortingChange(newSorting);
    } else {
      setInternalSorting(newSorting);
    }
  };
  
  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!currentSorting || !sortable) return data;
    
    const { id, direction } = currentSorting;
    if (!direction) return data;
    
    const column = columns.find(col => col.id === id);
    if (!column) return data;
    
    return [...data].sort((a, b) => {
      const accessor = column.accessor;
      
      // accessor가 함수인 경우
      const valueA = typeof accessor === 'function' ? accessor(a) : a[accessor as keyof T];
      const valueB = typeof accessor === 'function' ? accessor(b) : b[accessor as keyof T];
      
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, columns, currentSorting, sortable]);
  
  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    if (!pagination || !paginationState) return sortedData;
    
    const { pageIndex, pageSize } = paginationState;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    
    return sortedData.slice(start, end);
  }, [sortedData, pagination, paginationState]);
  
  // 최종 화면에 보여줄 데이터
  const displayData = pagination ? paginatedData : sortedData;
  
  // 데이터 총 개수 계산 (외부에서 제공하지 않으면 데이터 배열 길이 사용)
  const totalCount = typeof externalTotalCount === 'number' ? externalTotalCount : data.length;
  
  // 테이블 클래스 계산
  const tableClasses = `
    min-w-full
    divide-y
    divide-gray-200
    ${bordered ? 'border border-gray-200' : ''}
    ${className}
  `.trim();
  
  return (
    <div className="overflow-x-auto">
      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}
      
      <table className={tableClasses}>
        <TableHead
          columns={columns}
          sortable={sortable}
          currentSorting={currentSorting}
          onSortingChange={handleSortingChange}
        />
        
        <TableBody
          data={displayData}
          columns={columns}
          isLoading={isLoading}
          onRowClick={onRowClick}
          striped={striped}
          hoverable={hoverable}
        />
      </table>
      
      {pagination && paginationState && (
        <TablePagination
          totalCount={totalCount}
          pageIndex={paginationState.pageIndex}
          pageSize={paginationState.pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

export default Table;