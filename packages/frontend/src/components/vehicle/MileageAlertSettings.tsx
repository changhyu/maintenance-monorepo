import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Table, Switch, InputNumber, Space, Popconfirm, message, Card, Typography, Divider, Badge } from 'antd';
import { 
  MileageAlertService, 
  MileageAlert, 
  MileageAlertType, 
  AlertFrequency, 
  MileageUnit,
  CreateMileageAlertRequest
} from '../../services/mileageAlertService';
import { PlusOutlined, DeleteOutlined, EditOutlined, BellOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ApiClient } from '../../../../api-client/src/client';

const { Option } = Select;
const { Title, Text } = Typography;

// 알림 유형별 라벨 및 설명
const alertTypeOptions = [
  { value: MileageAlertType.OIL_CHANGE, label: '오일 교체', description: '차량 오일 교체 시기 알림' },
  { value: MileageAlertType.TIRE_ROTATION, label: '타이어 교체/로테이션', description: '타이어 교체 또는 로테이션 시기 알림' },
  { value: MileageAlertType.AIR_FILTER, label: '에어필터 교체', description: '에어필터 교체 시기 알림' },
  { value: MileageAlertType.BRAKE_CHECK, label: '브레이크 점검', description: '브레이크 상태 점검 알림' },
  { value: MileageAlertType.REGULAR_SERVICE, label: '정기 점검', description: '차량 정기 점검 알림' },
  { value: MileageAlertType.TIMING_BELT, label: '타이밍 벨트 교체', description: '타이밍 벨트 교체 시기 알림' },
  { value: MileageAlertType.CUSTOM, label: '사용자 정의 알림', description: '사용자가 정의한 유지보수 알림' }
];

// 알림 빈도 옵션
const frequencyOptions = [
  { value: AlertFrequency.ONCE, label: '1회 알림' },
  { value: AlertFrequency.DAILY, label: '매일' },
  { value: AlertFrequency.WEEKLY, label: '매주' },
  { value: AlertFrequency.BIWEEKLY, label: '격주' },
  { value: AlertFrequency.MONTHLY, label: '매월' }
];

// 주행거리 단위 옵션
const mileageUnitOptions = [
  { value: MileageUnit.KILOMETERS, label: '킬로미터 (km)' },
  { value: MileageUnit.MILES, label: '마일 (miles)' }
];

interface MileageAlertSettingsProps {
  apiClient: ApiClient;
  vehicleId: string;
  title?: string;
  currentMileage?: number;
  mileageUnit?: MileageUnit;
}

const MileageAlertSettings: React.FC<MileageAlertSettingsProps> = ({
  apiClient,
  vehicleId,
  title = '주행거리 알림 설정',
  currentMileage,
  mileageUnit = MileageUnit.KILOMETERS
}) => {
  const [form] = Form.useForm();
  const mileageAlertService = new MileageAlertService(apiClient);

  const [alerts, setAlerts] = useState<MileageAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState<MileageAlert | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // 알림 목록 로드
  useEffect(() => {
    fetchAlerts();
  }, [vehicleId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const alertList = await mileageAlertService.getVehicleAlerts(vehicleId);
      setAlerts(alertList);
    } catch (error) {
      console.error('주행거리 알림 로드 중 오류 발생:', error);
      message.error('알림 설정을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 폼 리셋
  const resetForm = () => {
    form.resetFields();
    setEditingAlert(null);
    setIsAdding(false);
  };

  // 알림 추가 폼 표시
  const showAddForm = () => {
    resetForm();
    form.setFieldsValue({
      alertType: MileageAlertType.OIL_CHANGE,
      mileageThreshold: 5000,
      mileageUnit: mileageUnit,
      frequency: AlertFrequency.ONCE,
      sendEmail: true,
      sendPush: true,
      sendSMS: false
    });
    setIsAdding(true);
  };

  // 알림 편집 폼 표시
  const showEditForm = (alert: MileageAlert) => {
    resetForm();
    setEditingAlert(alert);
    form.setFieldsValue({
      alertType: alert.alertType,
      mileageThreshold: alert.mileageThreshold,
      mileageUnit: alert.mileageUnit,
      description: alert.description,
      frequency: alert.frequency,
      sendEmail: alert.sendEmail,
      sendPush: alert.sendPush,
      sendSMS: alert.sendSMS
    });
    setIsAdding(true);
  };

  // 알림 저장 처리
  const handleSave = async (values: any) => {
    try {
      setLoading(true);
      
      if (editingAlert) {
        // 기존 알림 업데이트
        await mileageAlertService.updateAlert({
          id: editingAlert.id,
          ...values
        });
        message.success('알림 설정이 업데이트되었습니다.');
      } else {
        // 새 알림 생성
        const request: CreateMileageAlertRequest = {
          vehicleId,
          ...values
        };
        await mileageAlertService.createAlert(request);
        message.success('새 알림 설정이 생성되었습니다.');
      }
      
      // 목록 새로고침 및 폼 초기화
      fetchAlerts();
      resetForm();
    } catch (error) {
      console.error('알림 저장 중 오류 발생:', error);
      message.error('알림 설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 알림 삭제 처리
  const handleDelete = async (alertId: string) => {
    try {
      setLoading(true);
      await mileageAlertService.deleteAlert(alertId);
      message.success('알림 설정이 삭제되었습니다.');
      fetchAlerts();
    } catch (error) {
      console.error('알림 삭제 중 오류 발생:', error);
      message.error('알림 설정 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 알림 활성화/비활성화 토글 처리
  const handleToggleActive = async (alert: MileageAlert) => {
    try {
      setLoading(true);
      await mileageAlertService.toggleAlertActive(alert.id, !alert.isActive);
      message.success(`알림이 ${!alert.isActive ? '활성화' : '비활성화'}되었습니다.`);
      fetchAlerts();
    } catch (error) {
      console.error('알림 활성화 상태 변경 중 오류 발생:', error);
      message.error('알림 상태 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기본 알림 생성 처리
  const handleCreateDefaultAlerts = async () => {
    try {
      setLoading(true);
      await mileageAlertService.createDefaultAlerts(vehicleId);
      message.success('기본 알림 설정이 생성되었습니다.');
      fetchAlerts();
    } catch (error) {
      console.error('기본 알림 생성 중 오류 발생:', error);
      message.error('기본 알림 설정 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '알림 유형',
      dataIndex: 'alertType',
      key: 'alertType',
      render: (type: MileageAlertType) => {
        const option = alertTypeOptions.find(opt => opt.value === type);
        return option ? option.label : type;
      },
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '주행거리 기준',
      key: 'mileage',
      render: (_: unknown, record: MileageAlert) => {
        const unit = record.mileageUnit === MileageUnit.KILOMETERS ? 'km' : 'miles';
        return `${record.mileageThreshold.toLocaleString()} ${unit}`;
      },
    },
    {
      title: '알림 빈도',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (frequency: AlertFrequency) => {
        const option = frequencyOptions.find(opt => opt.value === frequency);
        return option ? option.label : frequency;
      },
    },
    {
      title: '알림 채널',
      key: 'channels',
      render: (_: unknown, record: MileageAlert) => {
        const channels = [];
        if (record.sendEmail) channels.push('이메일');
        if (record.sendSMS) channels.push('SMS');
        if (record.sendPush) channels.push('앱 알림');
        return channels.join(', ');
      },
    },
    {
      title: '상태',
      key: 'status',
      render: (_: unknown, record: MileageAlert) => (
        <Badge 
          status={record.isActive ? 'success' : 'default'}
          text={record.isActive ? '활성' : '비활성'}
        />
      ),
    },
    {
      title: '활성화',
      key: 'isActive',
      render: (_: unknown, record: MileageAlert) => (
        <Switch 
          checked={record.isActive} 
          onChange={() => handleToggleActive(record)}
          loading={loading}
        />
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (_: unknown, record: MileageAlert) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditForm(record)}
          />
          <Popconfirm
            title="정말 이 알림을 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button 
              type="text" 
              danger
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="mileage-alert-settings">
      <Card title={title}>
        <div className="mb-4 flex justify-between items-center">
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showAddForm}
            >
              알림 추가
            </Button>
            <Button 
              onClick={handleCreateDefaultAlerts} 
              icon={<BellOutlined />}
            >
              기본 알림 생성
            </Button>
          </Space>
          
          {currentMileage !== undefined && (
            <Text>
              현재 주행거리: <strong>{currentMileage.toLocaleString()} {mileageUnit === MileageUnit.KILOMETERS ? 'km' : 'miles'}</strong>
            </Text>
          )}
        </div>

        <Table 
          dataSource={alerts} 
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />

        {isAdding && (
          <>
            <Divider />
            <Card 
              title={editingAlert ? '알림 수정' : '알림 추가'} 
              type="inner"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
              >
                <Form.Item
                  name="alertType"
                  label="알림 유형"
                  rules={[{ required: true, message: '알림 유형을 선택해주세요' }]}
                >
                  <Select>
                    {alertTypeOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="description"
                  label="알림 설명"
                  rules={[{ required: true, message: '알림 설명을 입력해주세요' }]}
                >
                  <Input placeholder="예: 엔진 오일 교체 시기입니다" />
                </Form.Item>

                <Form.Item
                  name="mileageThreshold"
                  label="주행거리 기준"
                  rules={[{ required: true, message: '주행거리 기준을 입력해주세요' }]}
                >
                  <InputNumber 
                    min={1} 
                    step={100} 
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value: string | undefined) => {
                      const parsed = value?.replace(/\$\s?|(,*)/g, '');
                      return parsed ? Number(parsed) : 0;
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="mileageUnit"
                  label="주행거리 단위"
                  rules={[{ required: true, message: '주행거리 단위를 선택해주세요' }]}
                >
                  <Select>
                    {mileageUnitOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="frequency"
                  label="알림 빈도"
                  rules={[{ required: true, message: '알림 빈도를 선택해주세요' }]}
                >
                  <Select>
                    {frequencyOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="알림 채널">
                  <Space direction="vertical">
                    <Form.Item name="sendEmail" valuePropName="checked" noStyle>
                      <Switch checkedChildren="이메일" unCheckedChildren="이메일" />
                    </Form.Item>
                    <Form.Item name="sendSMS" valuePropName="checked" noStyle>
                      <Switch checkedChildren="SMS" unCheckedChildren="SMS" />
                    </Form.Item>
                    <Form.Item name="sendPush" valuePropName="checked" noStyle>
                      <Switch checkedChildren="앱 알림" unCheckedChildren="앱 알림" />
                    </Form.Item>
                  </Space>
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      저장
                    </Button>
                    <Button onClick={resetForm}>
                      취소
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default MileageAlertSettings; 