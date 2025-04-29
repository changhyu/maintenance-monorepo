import React from 'react';

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;            // 본문 내용
  scrollable?: boolean;                 // 내용이 길 때 스크롤 허용 여부
  className?: string;                   // 추가 클래스
}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  scrollable = true,
  className = '',
  ...rest
}) => {
  return (
    <div 
      className={`
        px-6 py-4
        ${scrollable ? 'overflow-y-auto max-h-[60vh]' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

ModalBody.displayName = 'ModalBody'; 