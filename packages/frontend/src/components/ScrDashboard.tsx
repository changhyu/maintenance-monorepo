import React, { ReactNode } from 'react';

/**
 * 스크롤 대시보드 Props 인터페이스
 */
interface ScrDashboardProps {
  /** 대시보드 제목 */
  title: string;
  /** 자식 요소 */
  children: ReactNode;
  /** 로딩 상태 */
  loading?: boolean;
  /** 헤더 컨텐츠 */
  headerContent?: ReactNode;
  /** 푸터 컨텐츠 */
  footerContent?: ReactNode;
  /** 최대 높이 */
  maxHeight?: string;
  /** 추가 클래스 */
  className?: string;
}

/**
 * 스크롤 가능한 대시보드 컴포넌트
 * 
 * 제목, 컨텐츠, 그리고 스크롤이 가능한 영역을 제공합니다.
 */
const ScrDashboard: React.FC<ScrDashboardProps> = ({
  title,
  children,
  loading = false,
  headerContent,
  footerContent,
  maxHeight = '500px',
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* 헤더 영역 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {headerContent && <div>{headerContent}</div>}
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div 
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="p-4">{children}</div>
        )}
      </div>

      {/* 푸터 영역 */}
      {footerContent && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default ScrDashboard; 