import React, { useState } from 'react';
import { Button, Select, message, Spin, Card, Typography, Space, Divider } from 'antd';
import type { SelectProps } from 'antd';
import { DownloadOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { useExport } from '../hooks/useExport';
import type { ExportFormat } from '../utils/exportUtils';

const { Title, Text } = Typography;
const { Option } = Select;

interface OfflineDataExportProps {
  className?: string;
}

/**
 * 오프라인 데이터 내보내기 컴포넌트
 */
const OfflineDataExport: React.FC<OfflineDataExportProps> = ({ className }) => {
  const [format, setFormat] = useState<ExportFormat>('json');
  
  const { 
    isExporting, 
    exportTodoCache, 
    exportVehicleCache, 
    exportPendingOperations, 
    exportAllOfflineData 
  } = useExport();

  const formatOptions: SelectProps['options'] = [
    { value: 'json', label: 'JSON 형식' },
    { value: 'csv', label: 'CSV 형식' },
    { value: 'excel', label: 'Excel 형식' },
  ];

  const handleFormatChange = (value: string) => {
    setFormat(value as ExportFormat);
  };

  const handleExportTodos = async () => {
    const success = await exportTodoCache(format);
    if (success) {
      message.success('투두 데이터 내보내기 완료');
    } else {
      message.error('투두 데이터 내보내기 실패');
    }
  };

  const handleExportVehicles = async () => {
    const success = await exportVehicleCache(format);
    if (success) {
      message.success('차량 데이터 내보내기 완료');
    } else {
      message.error('차량 데이터 내보내기 실패');
    }
  };

  const handleExportPendingOperations = async () => {
    const success = await exportPendingOperations(format);
    if (success) {
      message.success('대기 중인 작업 내보내기 완료');
    } else {
      message.error('대기 중인 작업 내보내기 실패');
    }
  };

  const handleExportAllData = async () => {
    const success = await exportAllOfflineData(format);
    if (success) {
      message.success('모든 오프라인 데이터 내보내기 완료');
    } else {
      message.error('오프라인 데이터 내보내기 실패');
    }
  };

  return (
    <Card 
      className={className}
      title={
        <Space>
          <DatabaseOutlined />
          <span>오프라인 데이터 내보내기</span>
        </Space>
      }
    >
      <Spin spinning={isExporting}>
        <div style={{ marginBottom: 20 }}>
          <Text>오프라인 모드에서 캐시된 데이터를 내보내고 백업할 수 있습니다.</Text>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <Text strong>내보내기 형식:</Text>
          <Select
            style={{ width: 150, marginLeft: 10 }}
            value={format}
            onChange={handleFormatChange}
            options={formatOptions}
          />
        </div>

        <Divider />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button 
            type="default" 
            icon={<DownloadOutlined />} 
            onClick={handleExportTodos}
            disabled={isExporting}
          >
            투두 데이터 내보내기
          </Button>
          
          <Button 
            type="default" 
            icon={<DownloadOutlined />} 
            onClick={handleExportVehicles}
            disabled={isExporting}
          >
            차량 데이터 내보내기
          </Button>
          
          <Button 
            type="default" 
            icon={<SyncOutlined />} 
            onClick={handleExportPendingOperations}
            disabled={isExporting}
          >
            대기 중인 작업 내보내기
          </Button>
          
          <Divider />
          
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExportAllData}
            disabled={isExporting}
          >
            모든 오프라인 데이터 내보내기
          </Button>
        </div>
      </Spin>
    </Card>
  );
};

export default OfflineDataExport; 