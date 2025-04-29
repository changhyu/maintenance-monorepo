import React, { useState } from 'react';
import { 
  Tabs, 
  TabList, 
  Tab, 
  TabPanel,
  Card,
  CardBody
} from '../components/common';

const TabsExample: React.FC = () => {
  const [_activeTab, setActiveTab] = useState('home');
  
  const handleTabChange = (tabId: string) => {
    console.log(`탭 변경: ${tabId}`);
    setActiveTab(tabId);
  };
  
  return (
    <div className="p-6 space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-4">기본 탭</h2>
        <Card>
          <CardBody>
            <Tabs defaultTab="home" onChange={handleTabChange}>
              <TabList>
                <Tab id="home">홈</Tab>
                <Tab id="profile">프로필</Tab>
                <Tab id="settings">설정</Tab>
                <Tab id="disabled" disabled>비활성화</Tab>
              </TabList>
              
              <TabPanel id="home">
                <h3 className="text-lg font-semibold mb-2">홈 탭 내용</h3>
                <p>이것은 홈 탭의 내용입니다. 기본적으로 선택되는 탭입니다.</p>
              </TabPanel>
              
              <TabPanel id="profile">
                <h3 className="text-lg font-semibold mb-2">프로필 탭 내용</h3>
                <p>이것은 프로필 탭의 내용입니다. 사용자 정보를 표시하는 데 사용할 수 있습니다.</p>
              </TabPanel>
              
              <TabPanel id="settings">
                <h3 className="text-lg font-semibold mb-2">설정 탭 내용</h3>
                <p>이것은 설정 탭의 내용입니다. 여기에서 앱 설정을 구성할 수 있습니다.</p>
              </TabPanel>
              
              <TabPanel id="disabled">
                <p>이 내용은 표시되지 않습니다. 탭이 비활성화되어 있기 때문입니다.</p>
              </TabPanel>
            </Tabs>
          </CardBody>
        </Card>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">다양한 스타일의 탭</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">기본 탭 (Default)</h3>
            <Tabs defaultTab="tab1">
              <TabList variant="default">
                <Tab id="tab1" variant="default">탭 1</Tab>
                <Tab id="tab2" variant="default">탭 2</Tab>
                <Tab id="tab3" variant="default">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">기본 스타일 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">박스형 탭 (Boxed)</h3>
            <Tabs defaultTab="tab1">
              <TabList variant="boxed">
                <Tab id="tab1" variant="boxed">탭 1</Tab>
                <Tab id="tab2" variant="boxed">탭 2</Tab>
                <Tab id="tab3" variant="boxed">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">박스형 스타일 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">알약형 탭 (Pills)</h3>
            <Tabs defaultTab="tab1">
              <TabList variant="pills">
                <Tab id="tab1" variant="pills">탭 1</Tab>
                <Tab id="tab2" variant="pills">탭 2</Tab>
                <Tab id="tab3" variant="pills">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">알약형 스타일 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">다양한 크기의 탭</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">작은 크기 (Small)</h3>
            <Tabs defaultTab="tab1">
              <TabList size="sm">
                <Tab id="tab1" size="sm">탭 1</Tab>
                <Tab id="tab2" size="sm">탭 2</Tab>
                <Tab id="tab3" size="sm">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">작은 크기 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">중간 크기 (Medium, 기본값)</h3>
            <Tabs defaultTab="tab1">
              <TabList size="md">
                <Tab id="tab1" size="md">탭 1</Tab>
                <Tab id="tab2" size="md">탭 2</Tab>
                <Tab id="tab3" size="md">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">중간 크기 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">큰 크기 (Large)</h3>
            <Tabs defaultTab="tab1">
              <TabList size="lg">
                <Tab id="tab1" size="lg">탭 1</Tab>
                <Tab id="tab2" size="lg">탭 2</Tab>
                <Tab id="tab3" size="lg">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">큰 크기 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">정렬 및 너비</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">왼쪽 정렬 (기본값)</h3>
            <Tabs defaultTab="tab1">
              <TabList align="start">
                <Tab id="tab1">탭 1</Tab>
                <Tab id="tab2">탭 2</Tab>
                <Tab id="tab3">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">왼쪽 정렬 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">가운데 정렬</h3>
            <Tabs defaultTab="tab1">
              <TabList align="center">
                <Tab id="tab1">탭 1</Tab>
                <Tab id="tab2">탭 2</Tab>
                <Tab id="tab3">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">가운데 정렬 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">오른쪽 정렬</h3>
            <Tabs defaultTab="tab1">
              <TabList align="end">
                <Tab id="tab1">탭 1</Tab>
                <Tab id="tab2">탭 2</Tab>
                <Tab id="tab3">탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">오른쪽 정렬 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">전체 너비 (Full Width)</h3>
            <Tabs defaultTab="tab1">
              <TabList>
                <Tab id="tab1" fullWidth>탭 1</Tab>
                <Tab id="tab2" fullWidth>탭 2</Tab>
                <Tab id="tab3" fullWidth>탭 3</Tab>
              </TabList>
              
              <TabPanel id="tab1">
                <p className="text-gray-700">전체 너비 탭의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab2">
                <p className="text-gray-700">탭 2의 내용입니다.</p>
              </TabPanel>
              <TabPanel id="tab3">
                <p className="text-gray-700">탭 3의 내용입니다.</p>
              </TabPanel>
            </Tabs>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">아이콘이 있는 탭</h2>
        <Tabs defaultTab="home">
          <TabList>
            <Tab 
              id="home" 
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
            >
              홈
            </Tab>
            <Tab 
              id="profile" 
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              프로필
            </Tab>
            <Tab 
              id="settings" 
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              설정
            </Tab>
          </TabList>
          
          <TabPanel id="home">
            <p className="text-gray-700">홈 탭의 내용입니다.</p>
          </TabPanel>
          <TabPanel id="profile">
            <p className="text-gray-700">프로필 탭의 내용입니다.</p>
          </TabPanel>
          <TabPanel id="settings">
            <p className="text-gray-700">설정 탭의 내용입니다.</p>
          </TabPanel>
        </Tabs>
      </section>
    </div>
  );
};

export default TabsExample; 