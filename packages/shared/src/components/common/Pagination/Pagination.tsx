import React, { useMemo } from 'react';

export interface PaginationProps {
  currentPage: number;             // 현재 페이지
  totalPages: number;              // 전체 페이지 수
  onPageChange: (page: number) => void; // 페이지 변경 이벤트 핸들러
  siblingCount?: number;           // 현재 페이지 양쪽에 표시할 페이지 버튼 수
  boundaryCount?: number;          // 처음과 끝에 항상 표시할 버튼 수
  showEdgeButtons?: boolean;       // 처음/끝 버튼 표시 여부
  showPrevNext?: boolean;          // 이전/다음 버튼 표시 여부
  size?: 'sm' | 'md' | 'lg';       // 페이지네이션 크기
  className?: string;              // 추가 클래스
  pageClassName?: string;          // 페이지 버튼 클래스
  activeClassName?: string;        // 활성 페이지 버튼 클래스
  disabledClassName?: string;      // 비활성화 버튼 클래스
  ellipsisClassName?: string;      // 말줄임표(...) 클래스
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  showEdgeButtons = true,
  showPrevNext = true,
  size = 'md',
  className = '',
  pageClassName = '',
  activeClassName = '',
  disabledClassName = '',
  ellipsisClassName = '',
}) => {
  // 유효한 현재 페이지 확인
  const normalizedPage = Math.max(1, Math.min(currentPage, totalPages));
  
  // 페이지 버튼 크기에 따른 클래스
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };
  
  // 페이지 버튼 생성 로직
  const pageButtons = useMemo(() => {
    const range = (start: number, end: number) => {
      const length = end - start + 1;
      return Array.from({ length }, (_, i) => start + i);
    };

    // 시작과 끝 계산
    const startPages = range(1, Math.min(boundaryCount, totalPages));
    const endPages = range(
      Math.max(totalPages - boundaryCount + 1, boundaryCount + 1),
      totalPages
    );

    const siblingsStart = Math.max(
      Math.min(
        normalizedPage - siblingCount,
        totalPages - boundaryCount - siblingCount * 2 - 1
      ),
      boundaryCount + 2
    );

    const siblingsEnd = Math.min(
      Math.max(
        normalizedPage + siblingCount,
        boundaryCount + siblingCount * 2 + 2
      ),
      endPages.length > 0 ? endPages[0] - 2 : totalPages - 1
    );

    // 중간 페이지 및 말줄임표 계산
    const itemList: (number | string)[] = [];

    // 시작 페이지
    [...startPages].forEach((page) => {
      itemList.push(page);
    });

    // 시작 말줄임표
    if (siblingsStart > boundaryCount + 2) {
      itemList.push('start-ellipsis');
    } else if (boundaryCount + 1 < totalPages - boundaryCount) {
      itemList.push(boundaryCount + 1);
    }

    // 중간 페이지
    const middleRange = range(siblingsStart, siblingsEnd);
    [...middleRange].forEach((page) => {
      if (!startPages.includes(page) && !endPages.includes(page)) {
        itemList.push(page);
      }
    });

    // 끝 말줄임표
    if (siblingsEnd < totalPages - boundaryCount - 1) {
      itemList.push('end-ellipsis');
    } else if (totalPages - boundaryCount > boundaryCount) {
      itemList.push(totalPages - boundaryCount);
    }

    // 끝 페이지
    [...endPages].forEach((page) => {
      if (!itemList.includes(page)) {
        itemList.push(page);
      }
    });

    return itemList;
  }, [normalizedPage, totalPages, siblingCount, boundaryCount]);

  // 공통 버튼 스타일
  const buttonBaseClass = `
    inline-flex items-center justify-center
    ${sizeClasses[size]}
    rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    transition-colors
    ${pageClassName}
  `;
  
  // 활성화 버튼 스타일
  const activeButtonClass = `
    bg-blue-600 text-white hover:bg-blue-700
    ${activeClassName}
  `;
  
  // 기본 버튼 스타일
  const defaultButtonClass = `
    bg-white text-gray-700 border border-gray-300 hover:bg-gray-50
  `;
  
  // 비활성화 버튼 스타일
  const disabledButtonClass = `
    bg-gray-100 text-gray-400 cursor-not-allowed
    ${disabledClassName}
  `;
  
  // 이전 페이지로 이동
  const handlePrev = () => {
    if (normalizedPage > 1) {
      onPageChange(normalizedPage - 1);
    }
  };
  
  // 다음 페이지로 이동
  const handleNext = () => {
    if (normalizedPage < totalPages) {
      onPageChange(normalizedPage + 1);
    }
  };
  
  // 처음 페이지로 이동
  const handleFirst = () => {
    onPageChange(1);
  };
  
  // 마지막 페이지로 이동
  const handleLast = () => {
    onPageChange(totalPages);
  };
  
  // 페이지 버튼 클릭
  const handlePageClick = (page: number) => {
    onPageChange(page);
  };
  
  // 페이지 버튼이 없는 경우 (totalPages가 0이거나 1인 경우)
  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <nav className={`flex items-center ${className}`} aria-label="페이지네이션">
      <ul className="flex items-center space-x-1">
        {/* 처음 버튼 */}
        {showEdgeButtons && (
          <li>
            <button
              onClick={handleFirst}
              disabled={normalizedPage === 1}
              className={`${buttonBaseClass} ${
                normalizedPage === 1 ? disabledButtonClass : defaultButtonClass
              }`}
              aria-label="첫 페이지"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </li>
        )}
        
        {/* 이전 버튼 */}
        {showPrevNext && (
          <li>
            <button
              onClick={handlePrev}
              disabled={normalizedPage === 1}
              className={`${buttonBaseClass} ${
                normalizedPage === 1 ? disabledButtonClass : defaultButtonClass
              }`}
              aria-label="이전 페이지"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </li>
        )}
        
        {/* 페이지 버튼 */}
        {pageButtons.map((page, index) => {
          if (typeof page === 'string') {
            // 말줄임표
            return (
              <li key={`${page}-${index}`}>
                <span className={`${buttonBaseClass} ${defaultButtonClass} ${ellipsisClassName}`} aria-hidden="true">
                  &hellip;
                </span>
              </li>
            );
          }
          
          return (
            <li key={page}>
              <button
                onClick={() => handlePageClick(page)}
                className={`${buttonBaseClass} ${
                  page === normalizedPage ? activeButtonClass : defaultButtonClass
                }`}
                aria-current={page === normalizedPage ? 'page' : undefined}
                aria-label={`페이지 ${page}`}
              >
                {page}
              </button>
            </li>
          );
        })}
        
        {/* 다음 버튼 */}
        {showPrevNext && (
          <li>
            <button
              onClick={handleNext}
              disabled={normalizedPage === totalPages}
              className={`${buttonBaseClass} ${
                normalizedPage === totalPages ? disabledButtonClass : defaultButtonClass
              }`}
              aria-label="다음 페이지"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        )}
        
        {/* 마지막 버튼 */}
        {showEdgeButtons && (
          <li>
            <button
              onClick={handleLast}
              disabled={normalizedPage === totalPages}
              className={`${buttonBaseClass} ${
                normalizedPage === totalPages ? disabledButtonClass : defaultButtonClass
              }`}
              aria-label="마지막 페이지"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}; 