import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Tooltip, Spin, Alert, Select, DatePicker } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useInspectionService } from '../../hooks/useInspectionService';
import { 
  Inspection, 
  InspectionStatus, 
  InspectionType,
  InspectionFilter
} from '../../types/inspection';

interface InspectionListProps {
  vehicleId?: string;
  limit?: number;
  showVehicleInfo?: boolean;
}

/**
 * 법정검사 목록 컴포넌트
 */
const InspectionList: React.FC<InspectionListProps> = ({ 
  vehicleId,
  limit,
  showVehicleInfo = false
}) => {
  const navigate = useNavigate();
  const { 
    inspections, 
    isLoading, 
    error, 
    getAllInspections,
    getInspectionsForVehicle 
  } = useInspectionService();

  const [filters, setFilters] = useState<InspectionFilter>({
    vehicleId: vehicleId,
  });
  
  useEffect(() => {
    const loadInspections = async () => {
      if (vehicleId) {
        await getInspectionsForVehicle(vehicleId);
      } else {
        await getAllInspections(filters);
      }
    };
    
    loadInspections();
  }, [vehicleId, filters]);
  
  const handleFilterChange = (field: keyof InspectionFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const getStatusTag = (status: InspectionStatus) => {
    const statusColors: Record<InspectionStatus, string> = {
      [InspectionStatus.PENDING]: 'orange',
      [InspectionStatus.SCHEDULED]: 'blue',
      [InspectionStatus.COMPLETED]: 'green',
      [InspectionStatus.EXPIRED]: 'red',
      [InspectionStatus.FAILED]: 'volcano',
    };
    
    const statusLabels: Record<InspectionStatus, string> = {
      [InspectionStatus.PENDING]: '대기중',
      [InspectionStatus.SCHEDULED]: '예정됨',
      [InspectionStatus.COMPLETED]: '완료',
      [InspectionStatus.EXPIRED]: '기한만료',
      [InspectionStatus.FAILED]: '불합격',
    };
    
    return (
      <Tag color={statusColors[status]}>
        {statusLabels[status]}
      </Tag>
    );
  };
  
  const getInspectionTypeLabel = (type: InspectionType) => {
    const typeLabels: Record<InspectionType, string> = {
      [InspectionType.REGULAR]: '정기검사',
      [InspectionType.EMISSION]: '배출가스검사',
      [InspectionType.SAFETY]: '안전검사',
      [InspectionType.COMPREHENSIVE]: '종합검사',
    };
    
    return typeLabels[type];
  };
  
  const columns = [
    ...(showVehicleInfo ? [{
      title: '차량 정보',
      dataIndex: 'vehicle',
      key: 'vehicle',
      render: (vehicle: any) => (
        vehicle ? (
          <span>
            {vehicle.make} {vehicle.model} ({vehicle.year})
            <br />
            {vehicle.licensePlate}
          </span>
        ) : '정보 없음'
      ),
    }] : []),
    {
      title: '검사 유형',
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      render: (type: InspectionType) => getInspectionTypeLabel(type),
    },
    {
      title: '검사 예정일',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: Inspection, b: Inspection) => 
        dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf(),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: InspectionStatus) => getStatusTag(status),
    },
    {
      title: '검사일',
      dataIndex: 'inspectionDate',
      key: 'inspectionDate',
      render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '결과',
      dataIndex: 'passed',
      key: 'passed',
      render: (passed: boolean | null) => {
        if (passed === null) return '-';
        return passed ? (
          <Tag color="green">합격</Tag>
        ) : (
          <Tag color="red">불합격</Tag>
        );
      },
    },
    {
      title: '다음 검사일',
      dataIndex: 'nextDueDate',
      key: 'nextDueDate',
      render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '액션',
      key: 'action',
      render: (text: string, record: Inspection) => (
        <Space size="small">
          <Tooltip title="상세 보기">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              onClick={() => navigate(`/inspections/${record.id}`)} 
            />
          </Tooltip>
          <Tooltip title="수정">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => navigate(`/inspections/${record.id}/edit`)} 
            />
          </Tooltip>
          {record.status !== InspectionStatus.COMPLETED && (
            <Tooltip title="완료 처리">
              <Button 
                icon={<CheckCircleOutlined />} 
                size="small"
                type="primary"
                onClick={() => navigate(`/inspections/${record.id}/complete`)} 
              />
            </Tooltip>
          )}
          <Tooltip title="삭제">
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              onClick={() => {/* 삭제 모달 오픈 */}}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  if (isLoading) {
    return <Spin tip="법정검사 목록 로딩중..." />;
  }
  
  if (error) {
    return <Alert type="error" message={error} />;
  }
  
  return (
    <div className="inspection-list">
      {!vehicleId && (
        <div className="inspection-filters" style={{ marginBottom: '1rem' }}>
          <Space wrap>
            <Select
              placeholder="검사 상태 선택"
              style={{ width: 150 }}
              allowClear
              onChange={value => handleFilterChange('status', value)}
              options={[
                { value: InspectionStatus.PENDING, label: '대기중' },
                { value: InspectionStatus.SCHEDULED, label: '예정됨' },
                { value: InspectionStatus.COMPLETED, label: '완료' },
                { value: InspectionStatus.EXPIRED, label: '기한만료' },
                { value: InspectionStatus.FAILED, label: '불합격' },
              ]}
            />
            <DatePicker 
              placeholder="이 날짜 이전 만료"
              onChange={date => handleFilterChange(
                'dueBefore', 
                date ? date.format('YYYY-MM-DD') : undefined
              )}
            />
            <DatePicker 
              placeholder="이 날짜 이후 만료"
              onChange={date => handleFilterChange(
                'dueAfter', 
                date ? date.format('YYYY-MM-DD') : undefined
              )}
            />
            <Button 
              type="primary" 
              onClick={() => navigate('/inspections/create')}
            >
              새 법정검사 등록
            </Button>
          </Space>
        </div>
      )}
      
      <Table
        columns={columns}
        dataSource={limit ? inspections.slice(0, limit) : inspections}
        rowKey="id"
        pagination={limit ? false : { pageSize: 10 }}
      />
      
      {limit && inspections.length > limit && (
        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
          <Button 
            type="link" 
            onClick={() => navigate('/inspections')}
          >
            모든 법정검사 보기
          </Button>
        </div>
      )}
    </div>
  );
};

export default InspectionList;