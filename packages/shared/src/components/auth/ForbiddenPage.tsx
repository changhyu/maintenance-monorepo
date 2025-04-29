import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface ForbiddenPageProps {
  /** 접근 거부 메시지 */
  message?: string;
  /** 홈페이지 URL */
  homeUrl?: string;
  /** 뒤로가기 여부 */
  showBackButton?: boolean;
}

/**
 * 권한이 없는 사용자가 보게 되는 접근 거부 페이지
 */
export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({
  message = '이 페이지에 접근할 권한이 없습니다.',
  homeUrl = '/',
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-5">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="80" 
            height="80" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="1" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-red-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="mb-4 text-4xl font-bold">403</h1>
        <h2 className="mb-2 text-2xl font-semibold">접근 거부됨</h2>
        <p className="mb-8 text-gray-600">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate(homeUrl)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            홈으로
          </button>
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              뒤로 가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 