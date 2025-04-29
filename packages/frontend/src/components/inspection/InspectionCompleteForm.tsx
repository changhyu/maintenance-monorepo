import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Switch, Spin, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useInspectionService } from '../../hooks/useInspectionService';
import { 
  InspectionCompleteRequest, 
  Inspection,
} from '../../types/inspection';

const { TextArea } = Input;

interface InspectionCompleteFormProps {
  inspectionId: string;
  onSuccess?: (inspection: Inspection) => void;
}

/**
 * 법정검사 완료 처리 폼 컴포넌트
 */
const InspectionCompleteForm: React.FC<InspectionCompleteFormProps> = ({
  inspectionId,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { 
    currentInspection, 
    isLoading, 
    error,
    getInspection,
    completeInspection
  } = useInspectionService();

  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  
  // 법정검사 정보 로드
  useEffect(() => {
    const loadInspection = async () => {
      if (inspectionId) {
        const data = await getInspection(inspectionId);
        setInspection(data);
      }
    };
    
    loadInspection();
  }, [inspectionId, getInspection]);
  
  // 폼 초기값 설정
  useEffect(() => {
    if (inspection) {
      form.setFieldsValue({
        inspectionDate: dayjs(),
        passed: true,
        fee: 0,
        certificateNumber: '',
        nextDueDate: dayjs().add(1, 'year'),
        notes: ''
      });
    }
  }, [form, inspection]);
  
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      const completeData: InspectionCompleteRequest = {
        inspectionDate: values.inspectionDate.format('YYYY-MM-DD'),
        passed: values.passed,
        fee: values.fee,
        certificateNumber: values.certificateNumber,
        nextDueDate: values.nextDueDate ? values.nextDueDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes
      };
      
      const result = await completeInspection(inspectionId, completeData);
      
      if (result) {
        if (onSuccess) {
          onSuccess(result);
        } else {
          navigate(`/inspections/${result.id}`);
        }
      }
    } catch (err) {
      console.error('법정검사 완료 처리 중 오류 발생:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <Spin tip="법정검사 정보 로딩 중..." />;
  }
  
  if (error) {
    return <Alert type="error" message={error} />;
  }
  
  if (!inspection) {
    return <Alert type="warning" message="법정검사 정보를 찾을 수 없습니다." />;
  }
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Form.Item
        name="inspectionDate"
        label="실제 검사일"
        rules={[{ required: true, message: '검사일을 선택하세요' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="passed"
        label="검사 결과"
        valuePropName="checked"
        rules={[{ required: true, message: '검사 결과를 선택하세요' }]}
      >
        <Switch 
          checkedChildren="합격" 
          unCheckedChildren="불합격" 
          defaultChecked={true}
        />
      </Form.Item>

      <Form.Item
        name="fee"
        label="검사 비용(원)"
        rules={[{ required: true, message: '검사 비용을 입력하세요' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
      </Form.Item>

      <Form.Item
        name="certificateNumber"
        label="검사 증명서 번호"
      >
        <Input placeholder="검사 증명서 번호를 입력하세요" />
      </Form.Item>

      <Form.Item
        name="nextDueDate"
        label="다음 검사 예정일"
        rules={[{ required: true, message: '다음 검사 예정일을 선택하세요' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="notes"
        label="비고"
      >
        <TextArea rows={4} placeholder="추가 정보 입력" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          완료 처리
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

export default InspectionCompleteForm;