import React from 'react';
import { Alert, Button, Space } from 'antd';
import { DisconnectOutlined, SyncOutlined } from '@ant-design/icons';

/**
 * 오프라인 상태 알림 컴포넌트 프롭스
 */
interface OfflineNoticeProps {
  pendingChangesCount?: number;
  onSync?: () => void;
}

/**
 * 오프라인 상태를 표시하는 알림 컴포넌트
 * 
 * @param props OfflineNoticeProps
 * @returns JSX.Element
 */
const OfflineNotice: React.FC<OfflineNoticeProps> = ({
  pendingChangesCount = 0,
  onSync
}) => {
  return (
    <Alert
      message="오프라인 모드"
      description={
        <Space direction="vertical">
          <span>
            현재 오프라인 상태입니다. 인터넷 연결이 복구되면 변경사항이 자동으로 동기화됩니다.
          </span>
          {pendingChangesCount > 0 && (
            <span>
              대기 중인 변경사항: {pendingChangesCount}개
            </span>
          )}
        </Space>
      }
      type="warning"
      icon={<DisconnectOutlined />}
      showIcon
      className="mb-4"
      action={
        pendingChangesCount > 0 && onSync && (
          <Button
            disabled
            icon={<SyncOutlined />}
            size="small"
          >
            동기화하기
          </Button>
        )
      }
    />
  );
};

export default OfflineNotice;
