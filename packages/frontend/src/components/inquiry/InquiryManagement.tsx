import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Table, 
  Select, 
  Button, 
  Space, 
  Empty, 
  Alert, 
  Spin, 
  Tag, 
  Modal, 
  Form, 
  message,
  Typography,
  Popconfirm,
  DatePicker,
  Divider
} from 'antd';
import { 
  ReloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { formatDate } from '../../utils/date-utils';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/ko_KR';
import InquiryAttachments, { AttachmentFile } from './InquiryAttachments';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 문의 데이터 타입 정의
export interface Inquiry {
  id: string;
  title: string;
  content: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  createdAt: string;
  status: 'pending' | 'inProgress' | 'resolved';
  assignedTo?: string;
  notes?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}

// 상태에 따른 라벨 및 색상 정의
const STATUS_CONFIG = {
  pending: { label: '대기중', color: 'warning' },
  inProgress: { label: '처리중', color: 'processing' },
  resolved: { label: '완료', color: 'success' }
};

const InquiryManagement: React.FC = () => {
  // 상태 관리
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // 문의 데이터 로드
  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      // 실제 API 연결 시 아래 코드 사용
      // const response = await InquiryService.getInquiries();
      // setInquiries(response.data);
      
      // 테스트용 대체 데이터
      setTimeout(() => {
        setInquiries(mockInquiries);
        setLoading(false);
      }, 800);
    } catch (err) {
      console.error('문의 목록을 불러오는 중 오류가 발생했습니다.', err);
      setError('문의 목록을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 필터링된 문의 목록
  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesText = searchText === '' || 
      inquiry.title.toLowerCase().includes(searchText.toLowerCase()) ||
      inquiry.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
      inquiry.customerEmail.toLowerCase().includes(searchText.toLowerCase()) ||
      (inquiry.content && inquiry.content.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    
    // 날짜 필터링
    const matchesDate = !dateRange[0] || !dateRange[1] || 
      (dayjs(inquiry.createdAt).isAfter(dateRange[0].startOf('day')) && 
       dayjs(inquiry.createdAt).isBefore(dateRange[1].endOf('day')));
    
    return matchesText && matchesStatus && matchesDate;
  });

  // 문의 상세 보기
  const handleViewDetail = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAttachments(inquiry.attachments || []);
    setIsModalOpen(true);
  };

  // 문의 상태 업데이트
  const handleStatusChange = async (id: string, newStatus: 'pending' | 'inProgress' | 'resolved') => {
    try {
      // 실제 API 연결 시 아래 코드 사용
      // await InquiryService.updateInquiryStatus(id, newStatus);
      
      // 테스트용 코드
      setInquiries(prevInquiries => prevInquiries.map(inquiry => 
        inquiry.id === id ? { ...inquiry, status: newStatus } : inquiry
      ));
      
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status: newStatus });
      }
      
      message.success('상태가 업데이트되었습니다.');
    } catch (err) {
      console.error('상태 업데이트 중 오류가 발생했습니다.', err);
      message.error('상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 문의 상세정보 업데이트
  const handleUpdateInquiry = async (values: any) => {
    if (!selectedInquiry) return;
    
    try {
      // 첨부 파일 추가
      const dataToUpdate = { ...values, attachments };
      
      // 실제 API 연결 시 아래 코드 사용
      // await InquiryService.updateInquiry(selectedInquiry.id, dataToUpdate);
      
      // 테스트용 코드
      const updatedInquiry = { ...selectedInquiry, ...dataToUpdate };
      setInquiries(prevInquiries => prevInquiries.map(inquiry => 
        inquiry.id === selectedInquiry.id ? updatedInquiry : inquiry
      ));
      
      setSelectedInquiry(updatedInquiry);
      message.success('문의 정보가 업데이트되었습니다.');
    } catch (err) {
      console.error('문의 업데이트 중 오류가 발생했습니다.', err);
      message.error('문의 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 문의 삭제 처리
  const handleDeleteInquiry = async (id: string) => {
    setDeleteLoading(true);
    try {
      // 실제 API 연결 시 아래 코드 사용
      // await InquiryService.deleteInquiry(id);
      
      // 테스트용 코드
      setInquiries(prevInquiries => prevInquiries.filter(inquiry => inquiry.id !== id));
      
      message.success('문의가 삭제되었습니다.');
      
      // 상세 모달이 열려있는 상태에서 해당 문의를 삭제한 경우
      if (selectedInquiry && selectedInquiry.id === id) {
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('문의 삭제 중 오류가 발생했습니다.', err);
      message.error('문의 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 날짜 범위 변경 처리
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateRange(dates || [null, null]);
  };

  // 첨부 파일 변경 처리
  const handleAttachmentsChange = (files: AttachmentFile[]) => {
    setAttachments(files);
    
    // 실제 API 연결 시 아래 코드 사용
    // if (selectedInquiry) {
    //   InquiryService.updateInquiry(selectedInquiry.id, { attachments: files });
    // }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '접수일자',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '고객명',
      dataIndex: 'customerName',
      key: 'customerName'
    },
    {
      title: '이메일',
      dataIndex: 'customerEmail',
      key: 'customerEmail'
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'pending' | 'inProgress' | 'resolved') => (
        <Tag color={STATUS_CONFIG[status].color}>
          {STATUS_CONFIG[status].label}
        </Tag>
      )
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: Inquiry) => (
        <Space>
          <Button type="link" onClick={() => handleViewDetail(record)}>상세보기</Button>
          <Select 
            value={record.status}
            style={{ width: 100 }}
            onChange={(value: string) => handleStatusChange(record.id, value as 'pending' | 'inProgress' | 'resolved')}
          >
            <Option value="pending">대기중</Option>
            <Option value="inProgress">처리중</Option>
            <Option value="resolved">완료</Option>
          </Select>
          <Popconfirm
            title="문의를 삭제하시겠습니까?"
            description="이 작업은 되돌릴 수 없습니다."
            onConfirm={() => handleDeleteInquiry(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              loading={deleteLoading && selectedInquiry?.id === record.id}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 테스트용 목 데이터
  const mockInquiries: Inquiry[] = [
    {
      id: '1',
      title: '차량 관리 시스템 도입 문의',
      content: '귀사의 차량 관리 시스템에 관심이 있습니다. 자세한 정보와 가격을 알고 싶습니다.',
      customerName: '김철수',
      customerEmail: 'kim@example.com',
      customerPhone: '010-1234-5678',
      createdAt: new Date().toISOString(),
      status: 'pending',
    },
    {
      id: '2',
      title: '시스템 사용 중 오류 발생',
      content: '차량 등록 시 오류가 발생합니다. 데이터가 저장되지 않는 문제가 있습니다.',
      customerName: '이영희',
      customerEmail: 'lee@example.com',
      customerPhone: '010-2345-6789',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1일 전
      status: 'inProgress',
      assignedTo: '기술지원팀',
      notes: '데이터베이스 연결 문제로 확인됨. 조치 중',
      attachments: [
        {
          name: '오류화면.png',
          url: 'https://example.com/error-screenshot.png',
          type: 'image/png',
          size: 156024
        }
      ]
    },
    {
      id: '3',
      title: '서비스 연장 문의',
      content: '현재 사용 중인 서비스의 연장을 하고 싶습니다. 할인 혜택이 있을까요?',
      customerName: '박민수',
      customerEmail: 'park@example.com',
      customerPhone: '010-3456-7890',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2일 전
      status: 'resolved',
      assignedTo: '영업팀',
      notes: '기존 고객 20% 할인 적용, 갱신 완료'
    }
  ];

  return (
    <div>
      <Card>
        <Title level={4}>문의 관리</Title>
        <Text type="secondary">고객으로부터 접수된 문의를 관리합니다.</Text>
        
        <div style={{ marginTop: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <Space style={{ flexWrap: 'wrap', marginBottom: '10px' }}>
            <Search
              placeholder="검색어를 입력하세요..."
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(value: string) => setStatusFilter(value)}
            >
              <Option value="all">모든 상태</Option>
              <Option value="pending">대기중</Option>
              <Option value="inProgress">처리중</Option>
              <Option value="resolved">완료</Option>
            </Select>
            <RangePicker 
              locale={locale}
              onChange={(dates) => handleDateRangeChange(dates)}
              placeholder={['시작일', '종료일']}
            />
          </Space>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={fetchInquiries}
          >
            새로고침
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin tip="로딩 중..." />
          </div>
        ) : error ? (
          <Alert
            message="문의 목록을 불러올 수 없습니다"
            description="문의 목록을 불러오는 중 오류가 발생했습니다."
            type="error"
            showIcon
          />
        ) : filteredInquiries.length === 0 ? (
          <Empty description="검색 조건에 맞는 문의가 없습니다." />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredInquiries}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* 문의 상세 모달 */}
      <Modal
        title="문의 상세정보"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={800}
        footer={null}
      >
        {selectedInquiry && (
          <Form
            layout="vertical"
            initialValues={selectedInquiry}
            onFinish={handleUpdateInquiry}
          >
            <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', minWidth: '100%' }}>
              <div style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <Title level={5}>{selectedInquiry.title}</Title>
                  <Tag color={STATUS_CONFIG[selectedInquiry.status].color} style={{ marginBottom: 15 }}>
                    {STATUS_CONFIG[selectedInquiry.status].label}
                  </Tag>
                  
                  <div style={{ marginBottom: 20 }}>
                    <Text strong>고객 정보</Text>
                    <p>이름: {selectedInquiry.customerName}</p>
                    <p>이메일: {selectedInquiry.customerEmail}</p>
                    {selectedInquiry.customerPhone && <p>전화번호: {selectedInquiry.customerPhone}</p>}
                    <p>접수일자: {formatDate(selectedInquiry.createdAt)}</p>
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                    <Text strong>문의 내용</Text>
                    <div style={{ marginTop: 8, padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
                      <p>{selectedInquiry.content}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <InquiryAttachments 
                      inquiryId={selectedInquiry.id}
                      attachments={attachments}
                      onChange={handleAttachmentsChange}
                    />
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <Form.Item label="처리 상태" name="status">
                    <Select onChange={(value: string) => handleStatusChange(selectedInquiry.id, value as 'pending' | 'inProgress' | 'resolved')}>
                      <Option value="pending">대기중</Option>
                      <Option value="inProgress">처리중</Option>
                      <Option value="resolved">완료</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item label="담당자" name="assignedTo">
                    <Input placeholder="담당자 이름" />
                  </Form.Item>
                  
                  <Form.Item label="메모" name="notes">
                    <Input.TextArea rows={6} placeholder="내부 메모를 작성하세요..." />
                  </Form.Item>
                </div>
              </div>
              
              <Divider />
              
              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Space>
                  <Popconfirm
                    title="문의를 삭제하시겠습니까?"
                    description="이 작업은 되돌릴 수 없습니다."
                    onConfirm={() => handleDeleteInquiry(selectedInquiry.id)}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button danger loading={deleteLoading}>
                      삭제
                    </Button>
                  </Popconfirm>
                  <Button onClick={() => setIsModalOpen(false)}>
                    취소
                  </Button>
                  <Button type="primary" htmlType="submit">
                    저장
                  </Button>
                </Space>
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default InquiryManagement;