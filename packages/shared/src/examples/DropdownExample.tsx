import React, { useState } from 'react';
import {
  Dropdown, 
  DropdownToggle, 
  DropdownMenu, 
  DropdownItem,
  DropdownHeader,
  DropdownDivider,
  Button
} from '../components/common';

const DropdownExample: React.FC = () => {
  // 제어 드롭다운 예제를 위한 상태
  const [isControlledOpen, setIsControlledOpen] = useState(false);
  
  return (
    <div className="p-6 space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-4">기본 드롭다운</h2>
        <div className="flex space-x-4">
          <Dropdown>
            <DropdownToggle>기본 드롭다운</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>프로필</DropdownItem>
              <DropdownItem>설정</DropdownItem>
              <DropdownDivider />
              <DropdownItem>로그아웃</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">드롭다운 메뉴 위치</h2>
        <div className="flex space-x-4">
          <Dropdown placement="bottom-start">
            <DropdownToggle>왼쪽 정렬</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>옵션 1</DropdownItem>
              <DropdownItem>옵션 2</DropdownItem>
              <DropdownItem>옵션 3</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          
          <Dropdown placement="bottom">
            <DropdownToggle>가운데 정렬</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>옵션 1</DropdownItem>
              <DropdownItem>옵션 2</DropdownItem>
              <DropdownItem>옵션 3</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          
          <Dropdown placement="bottom-end">
            <DropdownToggle>오른쪽 정렬</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>옵션 1</DropdownItem>
              <DropdownItem>옵션 2</DropdownItem>
              <DropdownItem>옵션 3</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          
          <Dropdown placement="top-start">
            <DropdownToggle>위쪽</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>옵션 1</DropdownItem>
              <DropdownItem>옵션 2</DropdownItem>
              <DropdownItem>옵션 3</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">아이콘 및 헤더가 있는 드롭다운</h2>
        <div className="flex space-x-4">
          <Dropdown>
            <DropdownToggle>
              사용자 메뉴
            </DropdownToggle>
            <DropdownMenu>
              <DropdownHeader>사용자 계정</DropdownHeader>
              <DropdownItem 
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                프로필
              </DropdownItem>
              <DropdownItem 
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                설정
              </DropdownItem>
              <DropdownDivider />
              <DropdownHeader>알림</DropdownHeader>
              <DropdownItem 
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                }
              >
                알림 설정
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem 
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                }
              >
                로그아웃
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">비활성화 항목 및 활성화 항목</h2>
        <div className="flex space-x-4">
          <Dropdown>
            <DropdownToggle>항목 상태</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>기본 항목</DropdownItem>
              <DropdownItem active>활성화된 항목</DropdownItem>
              <DropdownItem disabled>비활성화된 항목</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">링크 항목</h2>
        <div className="flex space-x-4">
          <Dropdown>
            <DropdownToggle>링크 메뉴</DropdownToggle>
            <DropdownMenu>
              <DropdownItem as="a" href="https://www.google.com" onClick={(e) => { e.preventDefault(); window.open('https://www.google.com', '_blank'); }}>구글</DropdownItem>
              <DropdownItem as="a" href="https://www.naver.com" onClick={(e) => { e.preventDefault(); window.open('https://www.naver.com', '_blank'); }}>네이버</DropdownItem>
              <DropdownItem as="a" href="https://www.github.com" onClick={(e) => { e.preventDefault(); window.open('https://www.github.com', '_blank'); }}>깃허브</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">제어 드롭다운</h2>
        <div className="flex space-x-4">
          <Dropdown isOpen={isControlledOpen} onToggle={setIsControlledOpen}>
            <DropdownToggle>제어 드롭다운</DropdownToggle>
            <DropdownMenu>
              <DropdownItem>옵션 1</DropdownItem>
              <DropdownItem>옵션 2</DropdownItem>
              <DropdownItem>옵션 3</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          
          <Button 
            onClick={() => setIsControlledOpen(!isControlledOpen)}
            variant={isControlledOpen ? "secondary" : "primary"}
          >
            {isControlledOpen ? '닫기' : '열기'}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default DropdownExample;