import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs는 Tabs 컴포넌트 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

export interface TabsProps {
  children: React.ReactNode;       // 탭 컨텐츠
  defaultTab?: string;             // 기본 선택 탭 ID
  onChange?: (tabId: string) => void; // 탭 변경 시 콜백
  variant?: 'default' | 'boxed' | 'pills'; // 탭 스타일
  size?: 'sm' | 'md' | 'lg';       // 탭 크기
  _align?: 'start' | 'center' | 'end'; // 탭 버튼 정렬
  _fullWidth?: boolean;             // 전체 너비 사용 여부
  className?: string;              // 추가 클래스
}

export const Tabs: React.FC<TabsProps> = ({
  children,
  defaultTab,
  onChange,
  variant = 'default',
  size = 'md',
  _align = 'start',
  _fullWidth = false,
  className = '',
}) => {
  // 첫 번째 탭을 기본 탭으로 설정 (defaultTab이 제공되지 않은 경우)
  const [activeTab, setActiveTab] = useState<string>(defaultTab || '');
  
  // activeTab 변경 시 콜백 호출
  const handleChangeTab = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };
  
  // TabsContext 값
  const contextValue = {
    activeTab,
    setActiveTab: handleChangeTab,
  };
  
  // 탭 변형에 따른 클래스
  const _variantClass = {
    default: 'border-b border-gray-200',
    boxed: 'border border-gray-200 rounded-lg p-1',
    pills: 'space-x-1',
  };
  
  // 탭 정렬에 따른 클래스
  const _alignClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };
  
  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={`
          w-full
          ${className}
        `}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}; 