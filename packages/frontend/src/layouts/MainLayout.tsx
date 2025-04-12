import React, { useState } from 'react';

import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  DashboardOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  FileTextOutlined,
  ToolOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { Layout, Menu, Avatar, Dropdown, Button, Badge } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { SubMenu } = Menu;

/**
 * 메인 레이아웃 컴포넌트
 */
const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 사이드바 토글
  const toggle = () => {
    setCollapsed(!collapsed);
  };

  // 현재 활성화된 메뉴 키 계산
  const getActiveMenuKey = () => {
    const path = location.pathname;
    if (path.startsWith('/vehicles')) return ['vehicles'];
    if (path.startsWith('/booking/history')) return ['booking-history'];
    if (path.startsWith('/booking')) return ['booking'];
    if (path.startsWith('/profile')) return ['profile'];
    return ['dashboard'];
  };

  // 로그아웃 처리
  const handleLogout = () => {
    // 실제 구현 시 인증 상태 초기화
    navigate('/login');
  };

  // 사용자 메뉴
  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link to="/profile">프로필</Link>
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        <Link to="/settings">설정</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        로그아웃
      </Menu.Item>
    </Menu>
  );

  // 알림 메뉴
  const notificationMenu = (
    <Menu>
      <Menu.Item key="notification1">
        <span>차량 1001 정비 예약이 확정되었습니다.</span>
      </Menu.Item>
      <Menu.Item key="notification2">
        <span>차량 1002 주행거리가 5,000km에 도달했습니다.</span>
      </Menu.Item>
      <Menu.Item key="notification3">
        <span>차량 1003 정비가 완료되었습니다.</span>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="all-notifications">
        <Link to="/notifications">모든 알림 보기</Link>
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 사이드바 */}
      <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
        <div
          className="logo"
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 24px'
          }}
        >
          <CarOutlined style={{ color: '#fff', fontSize: '24px' }} />
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: '18px', marginLeft: '10px' }}>
              정비 관리 시스템
            </span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getActiveMenuKey()}
          defaultOpenKeys={getActiveMenuKey()}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            <Link to="/dashboard">대시보드</Link>
          </Menu.Item>

          <Menu.Item key="vehicles" icon={<CarOutlined />}>
            <Link to="/vehicles">차량 관리</Link>
          </Menu.Item>

          <SubMenu key="booking" icon={<CalendarOutlined />} title="정비 예약">
            <Menu.Item key="booking">
              <Link to="/booking">예약 등록</Link>
            </Menu.Item>
            <Menu.Item key="booking-history">
              <Link to="/booking/history">예약 내역</Link>
            </Menu.Item>
          </SubMenu>

          <Menu.Item key="maintenance" icon={<ToolOutlined />}>
            <Link to="/maintenance">정비 이력</Link>
          </Menu.Item>

          <Menu.Item key="reports" icon={<FileTextOutlined />}>
            <Link to="/reports">보고서</Link>
          </Menu.Item>

          <SubMenu key="settings" icon={<SettingOutlined />} title="설정">
            <Menu.Item key="user-settings">
              <Link to="/settings/user">사용자 설정</Link>
            </Menu.Item>
            <Menu.Item key="system-settings">
              <Link to="/settings/system">시스템 설정</Link>
            </Menu.Item>
          </SubMenu>
        </Menu>
      </Sider>

      <Layout className="site-layout">
        {/* 헤더 */}
        <Header
          style={{
            padding: 0,
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: toggle,
              style: { padding: '0 24px', fontSize: '18px' }
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
            <Dropdown overlay={notificationMenu} placement="bottomRight">
              <Badge count={3} dot>
                <Button type="text" icon={<BellOutlined style={{ fontSize: '18px' }} />} />
              </Badge>
            </Dropdown>

            <Dropdown overlay={userMenu} placement="bottomRight">
              <div
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '24px'
                }}
              >
                <Avatar icon={<UserOutlined />} />
                <span style={{ marginLeft: '8px' }}>관리자</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 콘텐츠 */}
        <Content style={{ margin: '24px', background: '#fff', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
