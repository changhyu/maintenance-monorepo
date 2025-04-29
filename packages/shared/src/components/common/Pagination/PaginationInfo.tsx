import React from 'react';

export interface PaginationInfoProps {
  currentPage: number;           // 현재 페이지
  totalPages: number;            // 전체 페이지 수
  totalItems?: number;           // 총 아이템 수
  itemsPerPage?: number;         // 페이지당 아이템 수
  showPages?: boolean;           // 페이지 정보 표시 여부
  showItems?: boolean;           // 아이템 정보 표시 여부
  showRange?: boolean;           // 범위 정보 표시 여부
  className?: string;            // 추가 클래스
}

export const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  showPages = true,
  showItems = true,
  showRange = true,
  className = '',
}) => {
  // 페이지는 1부터 시작하므로, 범위 계산을 위해 조정
  const normalizedPage = Math.max(1, Math.min(currentPage, totalPages));
  
  // 범위 계산
  const startItem = (normalizedPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(normalizedPage * itemsPerPage, totalItems || (totalPages * itemsPerPage));
  
  // 아이템 수가 없는 경우 범위 정보 표시 안함
  const canShowRange = showRange && totalItems !== undefined;
  // 아이템 수가 없는 경우 아이템 정보 표시 안함
  const canShowItems = showItems && totalItems !== undefined;
  
  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      {/* 페이지 정보: "1 / 10 페이지" */}
      {showPages && (
        <span className="mr-2">
          {normalizedPage} / {totalPages} 페이지
        </span>
      )}
      
      {/* 전체 아이템 정보: "총 100개" */}
      {canShowItems && (
        <span className="mr-2">
          총 {totalItems.toLocaleString()}개
        </span>
      )}
      
      {/* 현재 범위 정보: "1-10 / 100" */}
      {canShowRange && (
        <span>
          {startItem.toLocaleString()}-{endItem.toLocaleString()} / {totalItems.toLocaleString()}
        </span>
      )}
    </div>
  );
}; 