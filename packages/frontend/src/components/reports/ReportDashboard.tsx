import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Button, 
  Table, 
  Form, 
  Select, 
  DatePicker, 
  Space, 
  Input, 
  Modal, 
  message, 
  Typography, 
  Tooltip,
  Empty,
  Spin,
  Checkbox
} from 'antd';
import { 
  FileTextOutlined, 
  BarChartOutlined, 
  CarOutlined, 
  DollarOutlined, 
  ToolOutlined, 
  CalendarOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ExportOutlined,
  MailOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import reportService, { 
  ReportType, 
  ReportFilter, 
  Report, 
  ReportFormat,
  ExportOptions
} from '../../services/reportService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 정비 보고서 대시보드 컴포넌트
 */
const ReportDashboard: React.FC = () => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<string>('create');
  const [reportType, setReportType] = useState<ReportType>(ReportType.COMPLETION_RATE);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
    new Date()
  ]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [maintenanceType, setMaintenanceType] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | ''>('');
  const [status, setStatus] = useState<'pending' | 'completed' | 'all'>('all');
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ReportFormat>(ReportFormat.PDF);
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [includeRawData, setIncludeRawData] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState<boolean>(false);
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // 페이지 로드 시 보고서 목록 가져오기
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchReports();
    }
  }, [activeTab]);

  // 보고서 목록 조회
  const fetchReports = async () => {
    setLoading(true);
    try {
      const reportList = await reportService.getReports();
      setReports(reportList);
    } catch (error) {
      console.error('보고서 목록 조회 중 오류 발생:', error);
      message.error('보고서 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 보고서 생성
  const generateReport = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      message.warning('날짜 범위를 선택해주세요.');
      return;
    }

    const filter: ReportFilter = {
      startDate: format(dateRange[0], 'yyyy-MM-dd'),
      endDate: format(dateRange[1], 'yyyy-MM-dd'),
      vehicleId: selectedVehicle || undefined,
      maintenanceType: maintenanceType || undefined,
      priority: priority || undefined,
      status: status === 'all' ? undefined : status
    };

    setLoading(true);
    try {
      let report;

      switch (reportType) {
        case ReportType.COMPLETION_RATE:
          report = await reportService.generateCompletionRateReport(filter);
          break;
        case ReportType.VEHICLE_HISTORY:
          if (!selectedVehicle) {
            message.warning('차량을 선택해주세요.');
            setLoading(false);
            return;
          }
          report = await reportService.generateVehicleHistoryReport(selectedVehicle, filter);
          break;
        case ReportType.COST_ANALYSIS:
          report = await reportService.generateCostAnalysisReport(filter);
          break;
        case ReportType.MAINTENANCE_SUMMARY:
          report = await reportService.generateMaintenanceSummaryReport(filter);
          break;
        case ReportType.MAINTENANCE_FORECAST:
          report = await reportService.generateMaintenanceForecastReport(filter);
          break;
      }

      message.success('보고서가 생성되었습니다.');
      setActiveTab('manage');
      fetchReports();
    } catch (error) {
      console.error('보고서 생성 중 오류 발생:', error);
      message.error('보고서 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 보고서 삭제
  const deleteReport = async (reportId: string) => {
    try {
      await reportService.deleteReport(reportId);
      message.success('보고서가 삭제되었습니다.');
      fetchReports();
    } catch (error) {
      console.error('보고서 삭제 중 오류 발생:', error);
      message.error('보고서 삭제에 실패했습니다.');
    }
  };

  // 보고서 내보내기
  const exportReport = async () => {
    if (!selectedReportId) return;

    const options: ExportOptions = {
      format: exportFormat,
      includeCharts,
      includeRawData,
      paperSize: 'a4',
      landscape: true
    };

    setExportLoading(true);
    try {
      const blob = await reportService.exportReport(selectedReportId, options);
      
      // 파일 다운로드
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${selectedReportId}.${exportFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportModalVisible(false);
      message.success('보고서를 내보냈습니다.');
    } catch (error) {
      console.error('보고서 내보내기 중 오류 발생:', error);
      message.error('보고서 내보내기에 실패했습니다.');
    } finally {
      setExportLoading(false);
    }
  };

  // 보고서 스케줄 설정
  const scheduleReport = async () => {
    if (!selectedReportId) return;
    
    const emails = emailRecipients.split(',').map(email => email.trim());
    
    if (emails.length === 0 || !emails[0]) {
      message.warning('최소 하나의 이메일 주소를 입력해주세요.');
      return;
    }
    
    try {
      await reportService.scheduleReport(
        reportType,
        {
          startDate: format(dateRange[0], 'yyyy-MM-dd'),
          endDate: format(dateRange[1], 'yyyy-MM-dd'),
          vehicleId: selectedVehicle || undefined,
          maintenanceType: maintenanceType || undefined,
          priority: priority || undefined,
          status: status === 'all' ? undefined : status
        },
        {
          frequency: scheduleFrequency,
          dayOfWeek: scheduleFrequency === 'weekly' ? 1 : undefined, // 월요일
          dayOfMonth: scheduleFrequency === 'monthly' ? 1 : undefined, // 1일
          time: '09:00'
        },
        {
          email: emails,
          shareLink: true
        }
      );
      
      setScheduleModalVisible(false);
      message.success('보고서 스케줄이 설정되었습니다.');
    } catch (error) {
      console.error('보고서 스케줄 설정 중 오류 발생:', error);
      message.error('보고서 스케줄 설정에 실패했습니다.');
    }
  };

  // 보고서 유형 아이콘 선택
  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case ReportType.COMPLETION_RATE:
        return <BarChartOutlined />;
      case ReportType.VEHICLE_HISTORY:
        return <CarOutlined />;
      case ReportType.COST_ANALYSIS:
        return <DollarOutlined />;
      case ReportType.MAINTENANCE_SUMMARY:
        return <ToolOutlined />;
      case ReportType.MAINTENANCE_FORECAST:
        return <CalendarOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // 보고서 유형 한글 이름
  const getReportTypeName = (type: ReportType) => {
    switch (type) {
      case ReportType.COMPLETION_RATE:
        return '완료율 보고서';
      case ReportType.VEHICLE_HISTORY:
        return '차량 정비 이력';
      case ReportType.COST_ANALYSIS:
        return '비용 분석 보고서';
      case ReportType.MAINTENANCE_SUMMARY:
        return '정비 요약 보고서';
      case ReportType.MAINTENANCE_FORECAST:
        return '정비 예측 보고서';
      default:
        return '보고서';
    }
  };

  // 보고서 목록 테이블 컬럼
  const columns = [
    {
      title: '보고서 이름',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Report) => (
        <Space>
          {getReportTypeIcon(record.type)}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: ReportType) => getReportTypeName(type),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: ko }),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: any, record: Report) => (
        <Space size="middle">
          <Tooltip title="내보내기">
            <Button
              type="text"
              icon={<ExportOutlined />}
              onClick={() => {
                setSelectedReportId(record.id);
                setExportModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="이메일 발송">
            <Button
              type="text"
              icon={<MailOutlined />}
              onClick={() => {
                setSelectedReportId(record.id);
                setScheduleModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="삭제">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '보고서 삭제',
                  content: '이 보고서를 삭제하시겠습니까?',
                  okText: '삭제',
                  cancelText: '취소',
                  onOk: () => deleteReport(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 샘플 차량 목록
  const sampleVehicles = [
    { id: 'V001', name: '현대 아반떼 (123가1234)' },
    { id: 'V002', name: '기아 K5 (456나5678)' },
    { id: 'V003', name: '쌍용 티볼리 (789다9012)' },
    { id: 'V004', name: '르노 SM6 (012라3456)' },
    { id: 'V005', name: '현대 그랜저 (345마6789)' },
  ];

  // 정비 유형 목록
  const maintenanceTypes = [
    '정기 점검',
    '엔진 정비',
    '브레이크 시스템',
    '냉각 시스템',
    '전기 시스템',
    '연료 시스템',
    '타이어 교체',
    '오일 교체'
  ];

  return (
    <Card title="정비 보고서" className="report-dashboard">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="보고서 생성" key="create">
          <div className="report-form">
            <Form layout="vertical">
              <Form.Item label="보고서 유형">
                <Select value={reportType} onChange={setReportType} style={{ width: '100%' }}>
                  <Option value={ReportType.COMPLETION_RATE}>
                    <Space>
                      <BarChartOutlined />
                      <span>완료율 보고서</span>
                    </Space>
                  </Option>
                  <Option value={ReportType.VEHICLE_HISTORY}>
                    <Space>
                      <CarOutlined />
                      <span>차량 정비 이력</span>
                    </Space>
                  </Option>
                  <Option value={ReportType.COST_ANALYSIS}>
                    <Space>
                      <DollarOutlined />
                      <span>비용 분석 보고서</span>
                    </Space>
                  </Option>
                  <Option value={ReportType.MAINTENANCE_SUMMARY}>
                    <Space>
                      <ToolOutlined />
                      <span>정비 요약 보고서</span>
                    </Space>
                  </Option>
                  <Option value={ReportType.MAINTENANCE_FORECAST}>
                    <Space>
                      <CalendarOutlined />
                      <span>정비 예측 보고서</span>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item label="기간 선택">
                <RangePicker 
                  value={[dateRange[0], dateRange[1]].map(date => date ? date : undefined)} 
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([dates[0].toDate(), dates[1].toDate()]);
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              {reportType === ReportType.VEHICLE_HISTORY && (
                <Form.Item label="차량 선택" required>
                  <Select
                    placeholder="차량 선택"
                    value={selectedVehicle}
                    onChange={setSelectedVehicle}
                    style={{ width: '100%' }}
                  >
                    {sampleVehicles.map(vehicle => (
                      <Option key={vehicle.id} value={vehicle.id}>{vehicle.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Form.Item label="정비 유형">
                <Select
                  placeholder="정비 유형 선택"
                  value={maintenanceType}
                  onChange={setMaintenanceType}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {maintenanceTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="우선순위">
                <Select
                  placeholder="우선순위 선택"
                  value={priority}
                  onChange={setPriority}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="high">높음</Option>
                  <Option value="medium">중간</Option>
                  <Option value="low">낮음</Option>
                </Select>
              </Form.Item>

              <Form.Item label="상태">
                <Select
                  value={status}
                  onChange={setStatus}
                  style={{ width: '100%' }}
                >
                  <Option value="all">모든 상태</Option>
                  <Option value="completed">완료</Option>
                  <Option value="pending">대기중</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={generateReport} 
                  loading={loading}
                  icon={<FileTextOutlined />}
                >
                  보고서 생성
                </Button>
              </Form.Item>
            </Form>
          </div>
        </TabPane>

        <TabPane tab="보고서 관리" key="manage">
          <div className="report-list">
            <Spin spinning={loading}>
              {reports.length === 0 ? (
                <Empty description="생성된 보고서가 없습니다." />
              ) : (
                <Table
                  dataSource={reports}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              )}
            </Spin>
          </div>
        </TabPane>
      </Tabs>

      {/* 내보내기 모달 */}
      <Modal
        title="보고서 내보내기"
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)}>
            취소
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<DownloadOutlined />}
            loading={exportLoading}
            onClick={exportReport}
          >
            내보내기
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="파일 형식">
            <Select
              value={exportFormat}
              onChange={setExportFormat}
              style={{ width: '100%' }}
            >
              <Option value={ReportFormat.PDF}>PDF</Option>
              <Option value={ReportFormat.EXCEL}>EXCEL</Option>
              <Option value={ReportFormat.CSV}>CSV</Option>
              <Option value={ReportFormat.JSON}>JSON</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <div>
              <Checkbox
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              >
                차트 포함
              </Checkbox>
            </div>
            <div>
              <Checkbox
                checked={includeRawData}
                onChange={(e) => setIncludeRawData(e.target.checked)}
              >
                원본 데이터 포함
              </Checkbox>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 스케줄 설정 모달 */}
      <Modal
        title="보고서 이메일 발송 스케줄"
        visible={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setScheduleModalVisible(false)}>
            취소
          </Button>,
          <Button
            key="schedule"
            type="primary"
            icon={<MailOutlined />}
            onClick={scheduleReport}
          >
            스케줄 설정
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="수신자 이메일" 
            help="여러 이메일은 쉼표(,)로 구분하세요."
          >
            <Input
              placeholder="example@example.com"
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="발송 주기">
            <Select
              value={scheduleFrequency}
              onChange={setScheduleFrequency}
              style={{ width: '100%' }}
            >
              <Option value="daily">매일</Option>
              <Option value="weekly">매주</Option>
              <Option value="monthly">매월</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ReportDashboard; 