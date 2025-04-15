import React, { useState, useEffect } from 'react';
import { Card, Switch, Typography, Divider, Badge, Space, Tabs } from 'antd';
import { 
  CloudOutlined, 
  DisconnectOutlined, 
  CloudDownloadOutlined, 
  WarningOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';
import { useOfflineMode, usePendingOperations } from '../hooks/useIndexedDB';
import OfflineDataExport from './OfflineDataExport';
import useNetwork from '../hooks/useNetwork';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface OfflineModeProps {
  className?: string;
}

/**
 * 오프라인 모드 설정 및 상태 컴포넌트
 */
const OfflineMode: React.FC<OfflineModeProps> = ({ className }) => {
  const { isOffline, setOfflineMode, isNetworkOnline } = useOfflineMode();
  const { pendingOperations, isLoading } = usePendingOperations();
  const network = useNetwork();
  
  // 네트워크 상태가 변경되면 오프라인 모드 설정 업데이트
  useEffect(() => {
    if (!network.isOnline && !isOffline) {
      setOfflineMode(true);
    }
  }, [network.isOnline, isOffline, setOfflineMode]);

  const handleToggleOfflineMode = async (checked: boolean) => {
    await setOfflineMode(checked);
  };

  const pendingCount = pendingOperations?.length || 0;

  return (
    <Card 
      className={className}
      title={
        <Space>
          {isOffline ? <DisconnectOutlined /> : <CloudOutlined />}
          <span>오프라인 모드</span>
          {pendingCount > 0 && (
            <Badge count={pendingCount} size="small" />
          )}
        </Space>
      }
    >
      <Tabs defaultActiveKey="settings">
        <TabPane 
          tab={
            <span>
              <CloudOutlined /> 
              설정
            </span>
          } 
          key="settings"
        >
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical">
              <Space>
                <Text>오프라인 모드:</Text>
                <Switch 
                  checked={isOffline} 
                  onChange={handleToggleOfflineMode} 
                  checkedChildren="활성화" 
                  unCheckedChildren="비활성화" 
                />
              </Space>
              
              <Text type={isNetworkOnline ? "success" : "danger"}>
                네트워크 상태: {isNetworkOnline ? "온라인" : "오프라인"}
              </Text>
              
              {network.connectionType && (
                <Text type="secondary">
                  연결 유형: {network.connectionType} ({network.effectiveType})
                </Text>
              )}
            </Space>
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>
              <Space>
                <CloudDownloadOutlined />
                <span>대기 중인 작업</span>
                <Badge count={pendingCount} style={{ backgroundColor: pendingCount > 0 ? '#ff4d4f' : '#52c41a' }} />
              </Space>
            </Title>
            
            <div style={{ marginTop: 8 }}>
              {pendingCount > 0 ? (
                <Text>
                  {pendingCount}개의 변경사항이 저장되어 있으며, 온라인 상태가 되면 동기화됩니다.
                </Text>
              ) : (
                <Text type="secondary">대기 중인 작업이 없습니다.</Text>
              )}
            </div>
            
            {!isNetworkOnline && isOffline && (
              <div style={{ marginTop: 16 }}>
                <Badge status="warning" text={
                  <Text type="warning">
                    <WarningOutlined /> 오프라인 상태입니다. 데이터가 서버에 동기화되지 않습니다.
                  </Text>
                } />
              </div>
            )}
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <DatabaseOutlined /> 
              데이터 내보내기
            </span>
          } 
          key="export"
        >
          <OfflineDataExport />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default OfflineMode; 