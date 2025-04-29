import React, { Fragment, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, MenuIcon, XIcon } from '@heroicons/react/outline';
import { UserCircleIcon, CogIcon, LogoutIcon } from '@heroicons/react/solid';

interface HeaderProps {
  userFullName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ userFullName, userRole, onLogout }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // 사이드바 토글 함수 메모이제이션
  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);
  
  // 사이드바 닫기 함수 메모이제이션
  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);
  
  // 로그아웃 핸들러 메모이제이션
  const handleLogout = useCallback(() => {
    onLogout && onLogout();
    setMobileSidebarOpen(false);
  }, [onLogout]);
  
  // 사용자 역할 표시 텍스트 메모이제이션
  const userRoleDisplay = useMemo(() => {
    return {
      'admin': '관리자',
      'manager': '매니저',
      'user': '일반사용자'
    }[userRole || 'user'];
  }, [userRole]);
  
  // 모바일 메뉴 버튼 메모이제이션
  const mobileMenuButton = useMemo(() => (
    <button
      type="button"
      className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      onClick={toggleMobileSidebar}
    >
      <span className="sr-only">메뉴 열기</span>
      {mobileSidebarOpen ? (
        <XIcon className="block h-6 w-6" aria-hidden="true" />
      ) : (
        <MenuIcon className="block h-6 w-6" aria-hidden="true" />
      )}
    </button>
  ), [mobileSidebarOpen, toggleMobileSidebar]);
  
  // 사용자 메뉴 아이템 메모이제이션
  const userMenuItems = useMemo(() => (
    <>
      <Menu.Item>
        {({ active }: { active: boolean }) => (
          <Link
            to="/profile"
            className={`${
              active ? 'bg-gray-100' : ''
            } block px-4 py-2 text-sm text-gray-700 flex items-center`}
          >
            <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
            내 프로필
          </Link>
        )}
      </Menu.Item>
      <Menu.Item>
        {({ active }: { active: boolean }) => (
          <Link
            to="/settings"
            className={`${
              active ? 'bg-gray-100' : ''
            } block px-4 py-2 text-sm text-gray-700 flex items-center`}
          >
            <CogIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
            설정
          </Link>
        )}
      </Menu.Item>
      <Menu.Item>
        {({ active }: { active: boolean }) => (
          <button
            onClick={handleLogout}
            className={`${
              active ? 'bg-gray-100' : ''
            } block w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center`}
          >
            <LogoutIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
            로그아웃
          </button>
        )}
      </Menu.Item>
    </>
  ), [handleLogout]);

  // 모바일 사이드바 콘텐츠 메모이제이션
  const mobileSidebarContent = useMemo(() => (
    <Transition
      show={mobileSidebarOpen}
      as={Fragment}
      enter="transition-opacity ease-linear duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity ease-linear duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-25" onClick={closeMobileSidebar}>
        <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-lg" onClick={e => e.stopPropagation()}>
          <div className="h-full flex flex-col py-6 bg-white shadow-xl overflow-y-auto">
            <div className="px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center">
                <img className="h-8 w-auto" src="/logo.svg" alt="차량 관리 시스템" />
                <span className="ml-2 text-lg font-medium text-gray-900">차량 관리 시스템</span>
              </div>
              <button
                type="button"
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={closeMobileSidebar}
              >
                <span className="sr-only">닫기</span>
                <XIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 relative flex-1 px-4 sm:px-6">
              {/* 모바일 내비게이션 */}
              <nav className="space-y-1">
                {/* 여기에 내비게이션 아이템 추가 - Sidebar 컴포넌트와 유사 */}
              </nav>
            </div>
            
            {/* 모바일 사용자 정보 */}
            <div className="border-t border-gray-200 pt-4 pb-3 px-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCircleIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{userFullName || '사용자'}</div>
                  <div className="text-sm font-medium text-gray-500">{userRoleDisplay}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={closeMobileSidebar}
                >
                  내 프로필
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={closeMobileSidebar}
                >
                  설정
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  ), [mobileSidebarOpen, closeMobileSidebar, handleLogout, userFullName, userRoleDisplay]);
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center md:hidden">
            {mobileMenuButton}
          </div>
          
          <div className="flex-1 flex items-center justify-center md:justify-end">
            <div className="flex-shrink-0 flex items-center">
              {/* 모바일에서만 로고가 중앙에 표시됨 */}
              <div className="flex items-center md:hidden">
                <img
                  className="h-8 w-auto"
                  src="/logo.svg"
                  alt="차량 관리 시스템"
                />
                <span className="ml-2 text-lg font-medium text-gray-900">차량 관리</span>
              </div>
            </div>
            
            <div className="hidden md:ml-4 md:flex md:items-center">
              {/* 알림 아이콘 */}
              <button
                type="button"
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">알림 보기</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>

              {/* 프로필 드롭다운 */}
              <Menu as="div" className="ml-4 relative flex-shrink-0">
                <div>
                  <Menu.Button className="bg-white rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span className="sr-only">사용자 메뉴 열기</span>
                    <div className="flex items-center">
                      <UserCircleIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
                      <div className="ml-2 text-left">
                        <p className="text-sm font-medium text-gray-700">{userFullName || '사용자'}</p>
                        <p className="text-xs text-gray-500">{userRoleDisplay}</p>
                      </div>
                    </div>
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    {userMenuItems}
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </div>
      
      {/* 모바일 사이드바 */}
      {mobileSidebarContent}
    </header>
  );
}, (prevProps, nextProps) => {
  // 필요한 프로퍼티만 비교하여 불필요한 렌더링 방지
  return prevProps.userFullName === nextProps.userFullName &&
         prevProps.userRole === nextProps.userRole &&
         prevProps.onLogout === nextProps.onLogout;
});