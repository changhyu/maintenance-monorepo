import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Popconfirm,
  message,
  Tabs,
  Typography,
  Divider,
  Switch,
  ColorPicker,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { 
  MapService, 
  Geofence, 
  GeofenceCreate, 
  GeofenceType, 
  GeofenceAlertType, 
  Coordinates,
  GeofenceEvent
} from '../../services/mapService';
import { ApiClient } from '../../../../api-client/src/client';
import { Vehicle } from '../../types/vehicle';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

interface GeofenceManagerProps {
  apiClient: ApiClient;
  vehicleList?: Vehicle[];
  onGeofenceSelect?: (geofence: Geofence) => void;
  onGeofenceCreate?: (geofence: Geofence) => void;
  onGeofenceUpdate?: (geofence: Geofence) => void;
  onGeofenceDelete?: (geofenceId: string) => void;
}

/**
 * 지오펜스 관리자 컴포넌트
 */
const GeofenceManager: React.FC<GeofenceManagerProps> = ({
  apiClient,
  vehicleList = [],
  onGeofenceSelect,
  onGeofenceCreate,
  onGeofenceUpdate,
  onGeofenceDelete,
}) => {
  // 서비스 초기화
  const mapService = new MapService(apiClient);

  // 상태 변수들
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('지오펜스 추가');
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [activeGeofenceId, setActiveGeofenceId] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([]);

  // Form 인스턴스
  const [form] = Form.useForm();

  // 지오펜스 목록 로드
  const loadGeofences = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mapService.getGeofences();
      setGeofences(data);
    } catch (error) {
      console.error('지오펜스 목록 로드 중 오류 발생:', error);
      message.error('지오펜스 목록을 로드하는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [mapService]);

  // 이벤트 목록 로드
  const loadGeofenceEvents = useCallback(async (geofenceId: string) => {
    try {
      setEventsLoading(true);
      // 현재 날짜 기준 지난 7일간의 이벤트 로드
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const events = await mapService.getGeofenceEvents(geofenceId, startDate, endDate);
      setGeofenceEvents(events);
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId} 이벤트 로드 중 오류 발생:`, error);
      message.error('지오펜스 이벤트를 로드하는 데 실패했습니다.');
    } finally {
      setEventsLoading(false);
    }
  }, [mapService]);

  // 컴포넌트 마운트 시 지오펜스 목록 로드
  useEffect(() => {
    loadGeofences();
  }, [loadGeofences]);

  // 지오펜스 추가 모달 열기
  const showAddModal = () => {
    form.resetFields();
    setModalTitle('지오펜스 추가');
    setEditingGeofence(null);
    setModalVisible(true);
  };

  // 지오펜스 편집 모달 열기
  const showEditModal = (geofence: Geofence) => {
    form.setFieldsValue({
      name: geofence.name,
      description: geofence.description,
      type: geofence.type,
      alerts: geofence.alerts,
      color: geofence.color,
      vehicleIds: geofence.vehicleIds,
      // 좌표 처리는 지오펜스 타입에 따라 달라짐
      ...(geofence.type === GeofenceType.CIRCLE
        ? {
            latitude: (geofence.coordinates as Coordinates).latitude,
            longitude: (geofence.coordinates as Coordinates).longitude,
            radius: geofence.radius,
          }
        : {}),
    });
    
    setModalTitle('지오펜스 편집');
    setEditingGeofence(geofence);
    setModalVisible(true);
  };

  // 모달 취소
  const handleCancel = () => {
    setModalVisible(false);
  };

  // 폼 제출 처리
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      let coordinates: Coordinates | Coordinates[];
      
      // 지오펜스 타입에 따라 좌표 처리
      if (values.type === GeofenceType.CIRCLE) {
        coordinates = {
          latitude: parseFloat(values.latitude),
          longitude: parseFloat(values.longitude),
        };
      } else if (values.type === GeofenceType.POLYGON || values.type === GeofenceType.RECTANGLE) {
        // 다각형이나 사각형의 경우 좌표 배열 처리 (값 형식에 따라 조정 필요)
        coordinates = values.coordinates || [];
      } else {
        coordinates = [];
      }
      
      const geofenceData: GeofenceCreate = {
        name: values.name,
        description: values.description,
        type: values.type,
        coordinates,
        radius: values.type === GeofenceType.CIRCLE ? values.radius : undefined,
        alerts: values.alerts,
        color: values.color,
        vehicleIds: values.vehicleIds,
      };
      
      if (editingGeofence) {
        // 기존 지오펜스 업데이트
        const updated = await mapService.updateGeofence(editingGeofence.id, geofenceData);
        message.success(`지오펜스 '${updated.name}'가 업데이트되었습니다.`);
        
        if (onGeofenceUpdate) {
          onGeofenceUpdate(updated);
        }
      } else {
        // 새 지오펜스 생성
        const created = await mapService.createGeofence(geofenceData);
        message.success(`지오펜스 '${created.name}'가 생성되었습니다.`);
        
        if (onGeofenceCreate) {
          onGeofenceCreate(created);
        }
      }
      
      setModalVisible(false);
      loadGeofences();
    } catch (error) {
      console.error('지오펜스 저장 중 오류 발생:', error);
      message.error('지오펜스를 저장하는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 지오펜스 삭제 처리
  const handleDelete = async (geofenceId: string) => {
    try {
      setLoading(true);
      await mapService.deleteGeofence(geofenceId);
      message.success('지오펜스가 삭제되었습니다.');
      
      if (onGeofenceDelete) {
        onGeofenceDelete(geofenceId);
      }
      
      loadGeofences();
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId} 삭제 중 오류 발생:`, error);
      message.error('지오펜스를 삭제하는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 탭 변경 처리
  const handleTabChange = (activeKey: string) => {
    if (activeKey === '2' && activeGeofenceId) {
      loadGeofenceEvents(activeGeofenceId);
    }
  };

  // 지오펜스 선택 처리
  const handleGeofenceSelect = (geofence: Geofence) => {
    setActiveGeofenceId(geofence.id);
    
    if (onGeofenceSelect) {
      onGeofenceSelect(geofence);
    }
  };

  // 지오펜스 활성화 상태 변경
  const handleStatusChange = async (geofenceId: string, active: boolean) => {
    try {
      setLoading(true);
      await mapService.updateGeofence(geofenceId, { active });
      message.success(`지오펜스가 ${active ? '활성화' : '비활성화'}되었습니다.`);
      loadGeofences();
    } catch (error) {
      console.error(`지오펜스 ID ${geofenceId} 상태 변경 중 오류 발생:`, error);
      message.error('지오펜스 상태를 변경하는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 지오펜스 목록 테이블 컬럼
  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Geofence) => (
        <a onClick={() => handleGeofenceSelect(record)}>{text}</a>
      ),
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: GeofenceType) => {
        let label = '';
        switch (type) {
          case GeofenceType.CIRCLE:
            label = '원형';
            break;
          case GeofenceType.POLYGON:
            label = '다각형';
            break;
          case GeofenceType.RECTANGLE:
            label = '사각형';
            break;
          default:
            label = type;
        }
        return <Tag color="blue">{label}</Tag>;
      },
    },
    {
      title: '알림',
      dataIndex: 'alerts',
      key: 'alerts',
      render: (alerts: GeofenceAlertType[]) => (
        <>
          {alerts.map(alert => {
            let color = '';
            let label = '';
            switch (alert) {
              case GeofenceAlertType.ENTRY:
                color = 'green';
                label = '진입';
                break;
              case GeofenceAlertType.EXIT:
                color = 'red';
                label = '이탈';
                break;
              case GeofenceAlertType.DWELL:
                color = 'orange';
                label = '체류';
                break;
              default:
                color = 'default';
                label = alert;
            }
            return <Tag color={color} key={alert}>{label}</Tag>;
          })}
        </>
      ),
    },
    {
      title: '상태',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: Geofence) => (
        <Switch
          checked={active}
          onChange={(checked) => handleStatusChange(record.id, checked)}
          checkedChildren="활성"
          unCheckedChildren="비활성"
        />
      ),
    },
    {
      title: '차량',
      dataIndex: 'vehicleIds',
      key: 'vehicleIds',
      render: (vehicleIds: string[] | undefined) => (
        <span>{vehicleIds?.length || 0}대</span>
      ),
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: Geofence) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          />
          <Popconfirm
            title="이 지오펜스를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="예"
            cancelText="아니오"
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

  // 이벤트 목록 테이블 컬럼
  const eventColumns = [
    {
      title: '차량',
      dataIndex: 'vehicleId',
      key: 'vehicleId',
      render: (vehicleId: string) => {
        const vehicle = vehicleList.find(v => v.id === vehicleId);
        return vehicle ? vehicle.name : vehicleId;
      },
    },
    {
      title: '이벤트 유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: GeofenceAlertType) => {
        let color = '';
        let label = '';
        switch (type) {
          case GeofenceAlertType.ENTRY:
            color = 'green';
            label = '진입';
            break;
          case GeofenceAlertType.EXIT:
            color = 'red';
            label = '이탈';
            break;
          case GeofenceAlertType.DWELL:
            color = 'orange';
            label = '체류';
            break;
          default:
            color = 'default';
            label = type;
        }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '시간',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
      render: (location: Coordinates) => (
        <Tooltip title={`위도: ${location.latitude}, 경도: ${location.longitude}`}>
          <Button
            type="text"
            icon={<EnvironmentOutlined />}
            size="small"
          >
            지도에서 보기
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="geofence-manager">
      <Card
        title={
          <Space>
            <EnvironmentOutlined />
            <span>지오펜스 관리</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showAddModal}
          >
            지오펜스 추가
          </Button>
        }
      >
        <Tabs defaultActiveKey="1" onChange={handleTabChange}>
          <TabPane
            tab={<span><EnvironmentOutlined />지오펜스 목록</span>}
            key="1"
          >
            <Table
              columns={columns}
              dataSource={geofences}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              onRow={(record) => ({
                onClick: () => handleGeofenceSelect(record),
              })}
            />
          </TabPane>
          
          <TabPane
            tab={<span><InfoCircleOutlined />이벤트 기록</span>}
            key="2"
            disabled={!activeGeofenceId}
          >
            {activeGeofenceId && (
              <Table
                columns={eventColumns}
                dataSource={geofenceEvents}
                rowKey="id"
                loading={eventsLoading}
                pagination={{ pageSize: 10 }}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 지오펜스 추가/편집 모달 */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: GeofenceType.CIRCLE,
            alerts: [GeofenceAlertType.ENTRY, GeofenceAlertType.EXIT],
            radius: 1000, // 1km 기본값
            color: '#1890ff',
          }}
        >
          <Form.Item
            name="name"
            label="지오펜스 이름"
            rules={[{ required: true, message: '지오펜스 이름을 입력하세요' }]}
          >
            <Input placeholder="예: 회사 주변" />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <Input.TextArea placeholder="지오펜스에 대한 추가 설명을 입력하세요" />
          </Form.Item>

          <Form.Item
            name="type"
            label="지오펜스 유형"
            rules={[{ required: true, message: '지오펜스 유형을 선택하세요' }]}
          >
            <Select>
              <Option value={GeofenceType.CIRCLE}>원형</Option>
              <Option value={GeofenceType.POLYGON}>다각형</Option>
              <Option value={GeofenceType.RECTANGLE}>사각형</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              
              if (type === GeofenceType.CIRCLE) {
                return (
                  <>
                    <Title level={5}>원형 지오펜스 설정</Title>
                    <Divider />
                    
                    <Space>
                      <Form.Item
                        name="latitude"
                        label="위도"
                        rules={[{ required: true, message: '위도를 입력하세요' }]}
                      >
                        <InputNumber
                          step={0.000001}
                          precision={6}
                          placeholder="37.5665"
                        />
                      </Form.Item>

                      <Form.Item
                        name="longitude"
                        label="경도"
                        rules={[{ required: true, message: '경도를 입력하세요' }]}
                      >
                        <InputNumber
                          step={0.000001}
                          precision={6}
                          placeholder="126.9780"
                        />
                      </Form.Item>
                    </Space>

                    <Form.Item
                      name="radius"
                      label="반경 (미터)"
                      rules={[{ required: true, message: '반경을 입력하세요' }]}
                    >
                      <InputNumber
                        min={100}
                        max={10000}
                        step={100}
                        placeholder="1000"
                        addonAfter="m"
                      />
                    </Form.Item>
                  </>
                );
              }
              
              if (type === GeofenceType.POLYGON || type === GeofenceType.RECTANGLE) {
                return (
                  <>
                    <Title level={5}>
                      {type === GeofenceType.POLYGON ? '다각형' : '사각형'} 지오펜스 설정
                    </Title>
                    <Divider />
                    
                    <Form.Item>
                      <Text type="secondary">
                        지도에서 {type === GeofenceType.POLYGON ? '다각형' : '사각형'}을 그려 지오펜스를 생성하세요.
                      </Text>
                    </Form.Item>
                    
                    {/* 여기에 지도 컴포넌트나 좌표 입력 UI를 구현할 수 있습니다 */}
                  </>
                );
              }
              
              return null;
            }}
          </Form.Item>

          <Title level={5}>알림 설정</Title>
          <Divider />

          <Form.Item
            name="alerts"
            label="알림 유형"
            rules={[{ required: true, message: '적어도 하나의 알림 유형을 선택하세요' }]}
          >
            <Select mode="multiple" placeholder="알림 유형 선택">
              <Option value={GeofenceAlertType.ENTRY}>진입 시 알림</Option>
              <Option value={GeofenceAlertType.EXIT}>이탈 시 알림</Option>
              <Option value={GeofenceAlertType.DWELL}>체류 시 알림</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="color"
            label="지오펜스 색상"
          >
            <ColorPicker />
          </Form.Item>

          <Title level={5}>차량 할당</Title>
          <Divider />

          <Form.Item
            name="vehicleIds"
            label="모니터링할 차량"
            extra="선택한 차량들이 이 지오펜스의 영역을 진입하거나 이탈할 때 알림을 받습니다."
          >
            <Select
              mode="multiple"
              placeholder="차량 선택"
              optionFilterProp="children"
              showSearch
              allowClear
            >
              {vehicleList.map(vehicle => (
                <Option key={vehicle.id} value={vehicle.id}>
                  <Space>
                    <CarOutlined />
                    <span>{vehicle.name}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingGeofence ? '업데이트' : '생성'}
              </Button>
              <Button onClick={handleCancel}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GeofenceManager; 