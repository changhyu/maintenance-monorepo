import React from 'react';

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;            // 푸터 내용
  divider?: boolean;                    // 구분선 표시 여부
  className?: string;                   // 추가 클래스
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  divider = true,
  className = '',
  ...rest
}) => {
  return (
    <div 
      className={`
        px-6 py-4 flex justify-end items-center space-x-2
        ${divider ? 'border-t border-gray-200' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

ModalFooter.displayName = 'ModalFooter'; 