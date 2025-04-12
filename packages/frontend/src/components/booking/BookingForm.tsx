import React, { useState, useEffect } from 'react';

import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Row,
  Col,
  Card,
  Alert,
  Spin
} from 'antd';
import dayjs from 'dayjs';

import { ApiClient } from '../../../../api-client/src/client';
import {
  bookingService,
  CreateBookingRequest,
  ServiceType,
  TimeSlot
} from '../../services/bookingService';

const { Option } = Select;
const { TextArea } = Input;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
}

interface Shop {
  id: string;
  name: string;
  address: string;
  rating: number;
  distance?: number;
}

interface BookingFormProps {
  apiClient: ApiClient;
  customerId: string;
  vehicles: Vehicle[];
  availableShops: Shop[];
  onSuccess?: (booking: any) => void;
  onCancel?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  apiClient,
  customerId,
  vehicles,
  availableShops,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>(
    ServiceType.REGULAR_MAINTENANCE
  );
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // 날짜나 정비소가 변경되면 가용 시간대 조회
  useEffect(() => {
    if (selectedShop && selectedDate) {
      fetchAvailableTimeSlots();
    }
  }, [selectedShop, selectedDate, selectedServiceType]);

  // 가용 시간대 조회 함수
  const fetchAvailableTimeSlots = async () => {
    try {
      setIsCheckingAvailability(true);
      const timeSlots = await bookingService.getAvailableTimeSlots(
        selectedShop,
        selectedDate,
        selectedServiceType
      );
      setAvailableTimeSlots(timeSlots);
    } catch (err) {
      setError('가용 시간대 조회 중 오류가 발생했습니다.');
      console.error('가용 시간대 조회 오류:', err);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError(null);

      const bookingData: CreateBookingRequest = {
        customerId,
        vehicleId: values.vehicleId,
        shopId: values.shopId,
        serviceType: values.serviceType,
        additionalServices: values.additionalServices,
        scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
        scheduledTime: values.scheduledTime.format('HH:mm'),
        notes: values.notes
      };

      const booking = await bookingService.createBooking(bookingData);

      if (onSuccess) {
        onSuccess(booking);
      }

      form.resetFields();
    } catch (err) {
      setError('예약 생성 중 오류가 발생했습니다.');
      console.error('예약 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 차량 변경 핸들러
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
  };

  // 정비소 변경 핸들러
  const handleShopChange = (shopId: string) => {
    setSelectedShop(shopId);
  };

  // 날짜 변경 핸들러
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date.format('YYYY-MM-DD'));
    } else {
      setSelectedDate('');
    }
  };

  // 서비스 유형 변경 핸들러
  const handleServiceTypeChange = (serviceType: ServiceType) => {
    setSelectedServiceType(serviceType);
  };

  return (
    <Card title="차량 정비 예약" className="booking-form-card">
      {error && <Alert message={error} type="error" showIcon className="mb-4" />}

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            serviceType: ServiceType.REGULAR_MAINTENANCE
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehicleId"
                label="차량 선택"
                rules={[{ required: true, message: '차량을 선택해주세요' }]}
              >
                <Select placeholder="정비할 차량 선택" onChange={handleVehicleChange}>
                  {vehicles.map(vehicle => (
                    <Option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="serviceType"
                label="서비스 유형"
                rules={[{ required: true, message: '서비스 유형을 선택해주세요' }]}
              >
                <Select placeholder="필요한 서비스 선택" onChange={handleServiceTypeChange}>
                  <Option value={ServiceType.REGULAR_MAINTENANCE}>정기 유지보수</Option>
                  <Option value={ServiceType.REPAIR}>수리</Option>
                  <Option value={ServiceType.INSPECTION}>검사</Option>
                  <Option value={ServiceType.TIRE_CHANGE}>타이어 교체</Option>
                  <Option value={ServiceType.OIL_CHANGE}>오일 교체</Option>
                  <Option value={ServiceType.CUSTOM}>기타 서비스</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="additionalServices" label="추가 서비스 (선택사항)">
                <Select
                  mode="multiple"
                  placeholder="필요한 추가 서비스 선택"
                  optionLabelProp="label"
                >
                  <Option value="air_filter" label="에어필터 교체">
                    에어필터 교체
                  </Option>
                  <Option value="alignment" label="휠 얼라인먼트">
                    휠 얼라인먼트
                  </Option>
                  <Option value="battery" label="배터리 점검/교체">
                    배터리 점검/교체
                  </Option>
                  <Option value="brake" label="브레이크 점검">
                    브레이크 점검
                  </Option>
                  <Option value="cooling" label="냉각 시스템 점검">
                    냉각 시스템 점검
                  </Option>
                  <Option value="diagnostic" label="진단 검사">
                    진단 검사
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="shopId"
                label="정비소 선택"
                rules={[{ required: true, message: '정비소를 선택해주세요' }]}
              >
                <Select placeholder="정비소 선택" onChange={handleShopChange}>
                  {availableShops.map(shop => (
                    <Option key={shop.id} value={shop.id}>
                      {shop.name} {shop.distance ? `(${shop.distance}km)` : ''} - {shop.rating}★
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="scheduledDate"
                label="예약 날짜"
                rules={[{ required: true, message: '예약 날짜를 선택해주세요' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  disabledDate={current => {
                    // 오늘 이전 날짜는 선택 불가
                    return current && current < dayjs().startOf('day');
                  }}
                  onChange={handleDateChange}
                  placeholder="예약 날짜 선택"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="scheduledTime"
                label="예약 시간"
                rules={[{ required: true, message: '예약 시간을 선택해주세요' }]}
                extra={isCheckingAvailability ? '가능한 시간대 확인 중...' : ''}
              >
                <Select
                  placeholder="예약 시간 선택"
                  loading={isCheckingAvailability}
                  disabled={!selectedDate || !selectedShop || isCheckingAvailability}
                >
                  {availableTimeSlots
                    .filter(slot => slot.available)
                    .map(slot => (
                      <Option key={slot.time} value={slot.time}>
                        {slot.time}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="추가 요청사항 (선택사항)">
            <TextArea
              rows={4}
              placeholder="추가 요청사항이나 차량 상태에 대한 설명을 입력해주세요"
              maxLength={500}
            />
          </Form.Item>

          <Form.Item>
            <div className="flex justify-end space-x-2">
              {onCancel && <Button onClick={onCancel}>취소</Button>}
              <Button type="primary" htmlType="submit" loading={loading}>
                예약하기
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};

export default BookingForm;
