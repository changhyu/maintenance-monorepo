import React, { useState, useEffect } from 'react';
import { 
  Form, Input, Select, DatePicker, Button, 
  Row, Col, TimePicker, Checkbox, Card, message,
  Typography, Divider, Radio
} from 'antd';
import { 
  CarOutlined, ToolOutlined, CalendarOutlined, 
  UserOutlined, PhoneOutlined, EnvironmentOutlined 
} from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export interface MaintenanceShop {
  id: string;
  name: string;
  address: string;
  rating: number;
  services: string[];
  availableSlots?: string[];
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface MaintenanceBookingFormProps {
  vehicleId?: string;
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
}

/**
 * 정비 예약 폼 컴포넌트
 */
const MaintenanceBookingForm: React.FC<MaintenanceBookingFormProps> = ({
  vehicleId,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shops, setShops] = useState<MaintenanceShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [maintenanceTypes, setMaintenanceTypes] = useState<{id: string; name: string}[]>([]);
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // 컴포넌트 마운트 시 필요한 데이터 로드
  useEffect(() => {
    fetchVehicles();
    fetchShops();
    fetchMaintenanceTypes();
    
    // 초기 차량 ID가 있으면 폼에 설정
    if (vehicleId) {
      form.setFieldsValue({ vehicleId });
    }
  }, [vehicleId, form]);

  // 차량 데이터 조회
  const fetchVehicles = async () => {
    try {
      // const response = await apiClient.get('/vehicles');
      // setVehicles(response.data);
      
      // 샘플 데이터
      setVehicles([
        { id: 'v001', name: '차량 1001', type: '승용차', status: '운행 중' },
        { id: 'v002', name: '차량 1002', type: 'SUV', status: '운행 중' },
        { id: 'v003', name: '차량 1003', type: '화물차', status: '정비 중' },
        { id: 'v004', name: '차량 1004', type: '버스', status: '대기 중' },
        { id: 'v005', name: '차량 1005', type: '승용차', status: '점검 필요' }
      ]);
    } catch (error) {
      console.error('차량 데이터 조회 실패:', error);
      message.error('차량 데이터를 불러오는데 실패했습니다.');
    }
  };

  // 정비소 데이터 조회
  const fetchShops = async () => {
    try {
      // const response = await apiClient.get('/shops');
      // setShops(response.data);
      
      // 샘플 데이터
      setShops([
        { 
          id: 's001', 
          name: '서울 중앙 정비소', 
          address: '서울시 강남구 테헤란로 123', 
          rating: 4.8, 
          services: ['정기 점검', '엔진 수리', '타이어 교체', '오일 교체'] 
        },
        { 
          id: 's002', 
          name: '부산 정비 센터', 
          address: '부산시 해운대구 센텀로 456', 
          rating: 4.5, 
          services: ['정기 점검', '브레이크 수리', '배터리 교체', '에어컨 수리'] 
        },
        { 
          id: 's003', 
          name: '대구 종합 정비', 
          address: '대구시 수성구 대구로 789', 
          rating: 4.2, 
          services: ['엔진 오일 교체', '타이어 교체', '배터리 교체', '종합 점검'] 
        }
      ]);
    } catch (error) {
      console.error('정비소 데이터 조회 실패:', error);
      message.error('정비소 데이터를 불러오는데 실패했습니다.');
    }
  };

  // 정비 유형 조회
  const fetchMaintenanceTypes = async () => {
    try {
      // const response = await apiClient.get('/maintenance-types');
      // setMaintenanceTypes(response.data);
      
      // 샘플 데이터
      setMaintenanceTypes([
        { id: 'mt001', name: '정기 점검' },
        { id: 'mt002', name: '엔진 오일 교체' },
        { id: 'mt003', name: '타이어 교체' },
        { id: 'mt004', name: '브레이크 패드 교체' },
        { id: 'mt005', name: '에어컨 필터 교체' },
        { id: 'mt006', name: '배터리 교체' },
        { id: 'mt007', name: '종합 검사' }
      ]);
    } catch (error) {
      console.error('정비 유형 조회 실패:', error);
      message.error('정비 유형 데이터를 불러오는데 실패했습니다.');
    }
  };

  // 정비소 선택 시 가용 시간대 조회
  const handleShopChange = (shopId: string) => {
    setSelectedShop(shopId);
    fetchAvailableTimeSlots(shopId, form.getFieldValue('date'));
  };

  // 날짜 선택 시 가용 시간대 조회
  const handleDateChange = (date: any) => {
    if (selectedShop && date) {
      fetchAvailableTimeSlots(selectedShop, date);
    }
  };

  // 가용 시간대 조회
  const fetchAvailableTimeSlots = async (shopId: string, date: dayjs.Dayjs) => {
    try {
      // 실제 구현 시 API 호출
      // const response = await apiClient.get(`/shops/${shopId}/available-slots?date=${date.format('YYYY-MM-DD')}`);
      // setAvailableTimeSlots(response.data);
      
      // 샘플 데이터
      const slots = [
        '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
      ];
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('가용 시간대 조회 실패:', error);
      message.error('가용 시간대를 불러오는데 실패했습니다.');
    }
  };

  // 폼 제출 처리
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 예약 데이터 생성
      const bookingData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        urgencyLevel,
        status: '대기 중'
      };
      
      // 실제 구현 시 API 호출
      // const response = await apiClient.post('/bookings', bookingData);
      
      // 테스트용 타임아웃
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('정비 예약이 성공적으로 등록되었습니다.');
      
      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess('booking-' + Date.now());
      }
      
      // 폼 초기화
      form.resetFields();
    } catch (error) {
      console.error('예약 등록 실패:', error);
      message.error('예약 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 긴급도 변경 처리
  const handleUrgencyChange = (e: RadioChangeEvent) => {
    setUrgencyLevel(e.target.value);
  };

  return (
    <Card title="정비 예약" className="maintenance-booking-form">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          urgencyLevel: 'medium',
          requiresPickup: false,
          date: dayjs().add(1, 'day')
        }}
      >
        <Title level={5}>1. 차량 선택</Title>
        <Form.Item
          name="vehicleId"
          label="차량"
          rules={[{ required: true, message: '차량을 선택해주세요' }]}
        >
          <Select 
            placeholder="차량 선택" 
            suffixIcon={<CarOutlined />}
            disabled={!!vehicleId}
          >
            {vehicles.map(vehicle => (
              <Option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.type})
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Divider />
        
        <Title level={5}>2. 정비 정보</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="maintenanceTypeId"
              label="정비 유형"
              rules={[{ required: true, message: '정비 유형을 선택해주세요' }]}
            >
              <Select placeholder="정비 유형 선택" suffixIcon={<ToolOutlined />}>
                {maintenanceTypes.map(type => (
                  <Option key={type.id} value={type.id}>{type.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="긴급도">
              <Radio.Group 
                value={urgencyLevel} 
                onChange={handleUrgencyChange}
              >
                <Radio.Button value="low">낮음</Radio.Button>
                <Radio.Button value="medium">중간</Radio.Button>
                <Radio.Button value="high">높음</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="description"
          label="문제 설명"
        >
          <TextArea 
            rows={4} 
            placeholder="정비가 필요한 문제에 대해 상세히 설명해주세요"
          />
        </Form.Item>
        
        <Divider />
        
        <Title level={5}>3. 정비소 및 일정</Title>
        <Form.Item
          name="shopId"
          label="정비소"
          rules={[{ required: true, message: '정비소를 선택해주세요' }]}
        >
          <Select 
            placeholder="정비소 선택" 
            suffixIcon={<EnvironmentOutlined />}
            onChange={handleShopChange}
          >
            {shops.map(shop => (
              <Option key={shop.id} value={shop.id}>
                {shop.name} ({shop.address})
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="date"
              label="날짜"
              rules={[{ required: true, message: '날짜를 선택해주세요' }]}
            >
              <DatePicker 
                style={{ width: '100%' }} 
                disabledDate={current => current && current < dayjs().startOf('day')}
                onChange={handleDateChange}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="time"
              label="시간"
              rules={[{ required: true, message: '시간을 선택해주세요' }]}
            >
              <Select 
                placeholder="시간 선택" 
                disabled={!selectedShop || availableTimeSlots.length === 0}
              >
                {availableTimeSlots.map(slot => (
                  <Option key={slot} value={slot}>{slot}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item name="requiresPickup" valuePropName="checked">
          <Checkbox>픽업 서비스 필요</Checkbox>
        </Form.Item>
        
        <Divider />
        
        <Title level={5}>4. 연락처 정보</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="contactName"
              label="담당자 이름"
              rules={[{ required: true, message: '담당자 이름을 입력해주세요' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="담당자 이름" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contactPhone"
              label="연락처"
              rules={[
                { required: true, message: '연락처를 입력해주세요' },
                { pattern: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/, message: '올바른 연락처 형식이 아닙니다 (예: 010-1234-5678)' }
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="연락처 (예: 010-1234-5678)" />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item>
          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            {onCancel && (
              <Button 
                onClick={onCancel} 
                style={{ marginRight: '8px' }}
              >
                취소
              </Button>
            )}
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CalendarOutlined />}
            >
              예약 등록
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MaintenanceBookingForm; 