import React from 'react';
import { useTabs } from './Tabs';

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;       // 패널 내용
  id: string;                      // 패널 ID (연결된 탭 ID)
  keepMounted?: boolean;           // 비활성화 상태에서도 DOM에 유지할지 여부
  className?: string;              // 추가 클래스
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  id,
  keepMounted = false,
  className = '',
  ...rest
}) => {
  const { activeTab } = useTabs();
  const isActive = activeTab === id;
  
  // 비활성화 상태이고 keepMounted가 false면 렌더링하지 않음
  if (!isActive && !keepMounted) {
    return null;
  }
  
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
      className={`
        py-4
        ${isActive ? 'block' : 'hidden'}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}; 