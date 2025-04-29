import React from 'react';

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;           // 헤더 내용
  showCloseButton?: boolean;           // 닫기 버튼 표시 여부
  onClose?: () => void;                // 닫기 버튼 클릭 시 호출할 함수
  className?: string;                  // 추가 클래스
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  showCloseButton = true,
  onClose,
  className = '',
  ...rest
}) => {
  return (
    <div 
      className={`px-6 py-4 border-b border-gray-200 flex justify-between items-center ${className}`} 
      {...rest}
    >
      <div className="font-semibold text-lg">{children}</div>
      
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 rounded-md"
          aria-label="닫기"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      )}
    </div>
  );
};

ModalHeader.displayName = 'ModalHeader'; 