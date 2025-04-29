import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, DatePicker, InputNumber, Switch, Spin, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useVehicleService } from '../../hooks/useVehicleService';
import { useInspectionService } from '../../hooks/useInspectionService';
import { 
  InspectionCreateRequest, 
  InspectionUpdateRequest,
  InspectionType,
  Inspection
} from '../../types/inspection';

const { Option } = Select;
const { TextArea } = Input;

interface InspectionFormProps {
  inspectionId?: string;
  vehicleId?: string;
  mode: 'create' | 'edit';
  onSuccess?: (inspection: Inspection) => void;
}

/**
 * 법정검사 등록/수정 양식 컴포넌트
 */
const InspectionForm: React.FC<InspectionFormProps> = ({
  inspectionId,
  vehicleId,
  mode,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { vehicles, getAllVehicles } = useVehicleService();
  const { 
    currentInspection, 
    isLoading, 
    error,
    getInspection,
    createInspection,
    updateInspection
  } = useInspectionService();

  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode === 'edit';
  
  // 폼 초기화
  useEffect(() => {
    const initForm = async () => {
      // 차량 목록 로드
      await getAllVehicles();
      
      // 수정 모드인 경우 검사 데이터 로드
      if (isEdit && inspectionId) {
        await getInspection(inspectionId);
      }
    };
    
    initForm();
  }, [isEdit, inspectionId]);
  
  // 수정 모드에서 폼 필드 초기화
  useEffect(() => {
    if (isEdit && currentInspection) {
      form.setFieldsValue({
        vehicleId: currentInspection.vehicleId,
        inspectionType: currentInspection.inspectionType,
        dueDate: currentInspection.dueDate ? dayjs(currentInspection.dueDate) : undefined,
        location: currentInspection.location,
        inspector: currentInspection.inspector,
        notes: currentInspection.notes
      });
    } else if (!isEdit && vehicleId) {
      // 특정 차량에 대한 검사 등록인 경우
      form.setFieldsValue({
        vehicleId: vehicleId
      });
    }
  }, [isEdit, currentInspection, vehicleId, form]);
  
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      const formData = {
        ...values,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };
      
      let result;
      
      if (isEdit && inspectionId) {
        result = await updateInspection(inspectionId, formData as InspectionUpdateRequest);
      } else {
        result = await createInspection(formData as InspectionCreateRequest);
      }
      
      if (result) {
        if (onSuccess) {
          onSuccess(result);
        } else {
          navigate(`/inspections/${result.id}`);
        }
      }
    } catch (err) {
      console.error('법정검사 저장 중 오류 발생:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <Spin tip="데이터 로딩 중..." />;
  }
  
  if (error) {
    return <Alert type="error" message={error} />;
  }
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        inspectionType: InspectionType.REGULAR,
      }}
    >
      <Form.Item
        name="vehicleId"
        label="차량"
        rules={[{ required: true, message: '차량을 선택하세요' }]}
      >
        <Select
          placeholder="차량 선택"
          disabled={isEdit || !!vehicleId}
          showSearch
          optionFilterProp="children"
        >
          {vehicles.map(vehicle => (
            <Option key={vehicle.id} value={vehicle.id}>
              {vehicle.name || `${vehicle.manufacturer} ${vehicle.model} (${vehicle.year})`} - {vehicle.licensePlate || vehicle.vin || '번호판 정보 없음'}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="inspectionType"
        label="검사 유형"
        rules={[{ required: true, message: '검사 유형을 선택하세요' }]}
      >
        <Select placeholder="검사 유형 선택">
          <Option value={InspectionType.REGULAR}>정기검사</Option>
          <Option value={InspectionType.EMISSION}>배출가스검사</Option>
          <Option value={InspectionType.SAFETY}>안전검사</Option>
          <Option value={InspectionType.COMPREHENSIVE}>종합검사</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="dueDate"
        label="검사 예정일"
        rules={[{ required: true, message: '검사 예정일을 선택하세요' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="location"
        label="검사 장소"
      >
        <Input placeholder="검사소 이름 또는 주소" />
      </Form.Item>

      <Form.Item
        name="inspector"
        label="검사관"
      >
        <Input placeholder="검사 담당자 이름" />
      </Form.Item>

      <Form.Item
        name="notes"
        label="비고"
      >
        <TextArea rows={4} placeholder="추가 정보 입력" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          {isEdit ? '수정' : '등록'}
        </Button>
        <Button 
          style={{ marginLeft: 8 }} 
          onClick={() => navigate(-1)}
        >
          취소
        </Button>
      </Form.Item>
    </Form>
  );
};

export default InspectionForm;