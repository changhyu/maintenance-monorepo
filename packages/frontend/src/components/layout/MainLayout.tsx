import React from 'react';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  CarOutlined,
  ToolOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import NotificationBadge from '../notification/NotificationBadge';

// 컴포넌트 프롭스 인터페이스
interface MainLayoutProps {
  title?: string;
  description?: string;
}

const { Header, Sider, Content, Footer } = Layout;

const MainLayout: React.FC<MainLayoutProps> = ({
  title = '관리자 대시보드',
  description = '차량 정비 관리 시스템 - 관리자 대시보드'
}) => {
  const location = useLocation();
  
  // 현재 선택된 메뉴 아이템 키
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '1';
    if (path.startsWith('/vehicles')) return '2';
    if (path.startsWith('/maintenance')) return '3';
    if (path.startsWith('/schedule')) return '4';
    if (path.startsWith('/reports')) return '5';
    if (path.startsWith('/inquiries')) return '6';
    if (path.startsWith('/settings')) return '7';
    if (path.startsWith('/profile')) return '8';
    return '1';
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      
      <Layout style={{ minHeight: '100vh' }}>
        <Header className="bg-white px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <div className="text-xl font-bold mr-4">
              CarGoro
            </div>
            <span className="text-gray-500 text-sm hidden sm:inline">정비 관리 시스템</span>
          </div>
          <div className="flex items-center">
            <NotificationBadge />
            <div className="ml-3 flex items-center">
              <UserOutlined className="text-lg mr-2" />
              <span className="hidden sm:inline">관리자</span>
            </div>
          </div>
        </Header>
        
        <Layout>
          <Sider width={200} className="bg-white">
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              style={{ height: '100%', borderRight: 0 }}
            >
              <Menu.Item key="1" icon={<HomeOutlined />}>
                <Link to="/">대시보드</Link>
              </Menu.Item>
              <Menu.Item key="2" icon={<CarOutlined />}>
                <Link to="/vehicles">차량 관리</Link>
              </Menu.Item>
              <Menu.Item key="3" icon={<ToolOutlined />}>
                <Link to="/maintenance">정비 관리</Link>
              </Menu.Item>
              <Menu.Item key="4" icon={<CalendarOutlined />}>
                <Link to="/schedule">일정 관리</Link>
              </Menu.Item>
              <Menu.Item key="5" icon={<FileTextOutlined />}>
                <Link to="/reports">보고서</Link>
              </Menu.Item>
              <Menu.Item key="6" icon={<MessageOutlined />}>
                <Link to="/inquiries">문의 관리</Link>
              </Menu.Item>
              <Menu.Item key="7" icon={<SettingOutlined />}>
                <Link to="/settings">설정</Link>
              </Menu.Item>
              <Menu.Item key="8" icon={<UserOutlined />}>
                <Link to="/profile">내 프로필</Link>
              </Menu.Item>
            </Menu>
          </Sider>
          
          <Layout style={{ padding: '0 24px 24px' }}>
            <Content
              className="bg-white p-6 mt-6 mb-0"
              style={{ minHeight: 280 }}
            >
              <Outlet />
            </Content>
            
            <Footer style={{ textAlign: 'center' }}>
              CarGoro 정비 관리 시스템 ©{new Date().getFullYear()} 한국자동차정비산업
            </Footer>
          </Layout>
        </Layout>
      </Layout>
    </HelmetProvider>
  );
};

export default MainLayout;