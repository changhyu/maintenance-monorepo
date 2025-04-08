import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Checkbox,
  Row,
  Col,
  Tag,
  Dropdown,
  Menu,
  Popconfirm,
  List,
  Radio,
  Divider,
  Progress,
  Descriptions,
  Text,
  Badge
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
  MailOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  EditOutlined,
  PlusOutlined,
  CheckOutlined,
  LineChartOutlined,
  PieChartOutlined,
  PrinterOutlined,
  SettingOutlined,
  CloseOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import reportService, { 
  ReportType, 
  ReportFilter, 
  Report, 
  ReportFormat,
  ExportOptions,
  Report as ServiceReport,
  ReportTemplate,
  generateReport, exportReport
} from '../../services/reportService';
import VehicleService from '../../services/vehicle';
import ReportDetailModal from './ReportDetailModal';
import { downloadFile, exportReportData } from '../../utils/reportUtils';
import './styles.css';
import ScheduleReportModal from './ScheduleReportModal';
import ExportModal from './ExportModal';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;
const { Title } = Typography;

/**
 * 로컬 보고서 타입 (UI 표시용)
 */
interface LocalReport {
  id: string;
  name: string;
  type: ReportType;
  createdAt: string;
  dateRange: [string, string];
  vehicle?: string;
  maintenanceType?: string;
  status: string;
  data: Array<{
    date: string;
    description: string;
    status: string;
    priority: string;
  }>;
}

/**
 * 정비 보고서 대시보드 컴포넌트
 */
const ReportDashboard: React.FC = () => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<string>('create');
  const [reportType, setReportType] = useState<ReportType>(ReportType.COMPLETION_RATE);
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<LocalReport[]>([]);
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
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<LocalReport | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [filterReportType, setFilterReportType] = useState<ReportType | ''>('');
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [templateManageModalVisible, setTemplateManageModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [printLoading, setPrintLoading] = useState<boolean>(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // 페이지 로드 시 보고서 목록 가져오기
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchReports();
    }
  }, [activeTab]);

  // 보고서 필터링
  useEffect(() => {
    if (reports.length > 0) {
      filterReports();
    }
  }, [reports, searchText, filterReportType, filterDateRange]);

  // 보고서 필터링 함수
  const filterReports = () => {
    let filtered = [...reports];

    // 검색어 필터링
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(report => 
        report.name.toLowerCase().includes(searchLower) || 
        getReportTypeName(report.type).toLowerCase().includes(searchLower)
      );
    }

    // 보고서 유형 필터링
    if (filterReportType) {
      filtered = filtered.filter(report => report.type === filterReportType);
    }

    // 날짜 범위 필터링
    if (filterDateRange[0] && filterDateRange[1]) {
      const startDate = filterDateRange[0].startOf('day');
      const endDate = filterDateRange[1].endOf('day');
      
      filtered = filtered.filter(report => {
        const reportDate = dayjs(report.createdAt);
        return reportDate.isAfter(startDate) && reportDate.isBefore(endDate);
      });
    }

    setFilteredReports(filtered);
  };

  // 필터 초기화
  const resetFilters = () => {
    setSearchText('');
    setFilterReportType('');
    setFilterDateRange([null, null]);
  };

  // 보고서 목록 조회
  const fetchReports = async () => {
    setLoading(true);
    try {
      const reportList = await reportService.getReports();
      setReports(reportList);
      setFilteredReports(reportList);
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
      startDate: formatDate(dateRange[0]),
      endDate: formatDate(dateRange[1]),
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

  // 보고서 상세 보기
  const showReportDetail = (report: LocalReport) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  // 보고서 내보내기
  const exportReport = async () => {
    if (!selectedReportId) return;

    const report = reports.find(r => r.id === selectedReportId);
    if (!report) {
      message.error('보고서를 찾을 수 없습니다.');
      return;
    }

    const options: ExportOptions = {
      format: exportFormat,
      includeCharts,
      includeRawData,
      paperSize: 'a4',
      landscape: true
    };

    setExportLoading(true);
    try {
      if (exportFormat === ReportFormat.PDF) {
        // PDF는 서버에서 생성 후 다운로드
        const blob = await reportService.exportReport(selectedReportId, options);
        downloadFile(blob, `report-${selectedReportId}`, exportFormat);
      } else {
        // 다른 형식은 클라이언트에서 생성
        const data = exportReportData(report, options);
        downloadFile(data, `report-${selectedReportId}`, exportFormat);
      }
      
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
          startDate: formatDate(dateRange[0]),
          endDate: formatDate(dateRange[1]),
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

  // 날짜 포맷팅 유틸리티
  const formatDate = (date: Date): string => {
    return dayjs(date).format('YYYY-MM-DD');
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

  // 보고서 유형에 따른 태그 색상
  const getReportTypeColor = (type: ReportType) => {
    switch (type) {
      case ReportType.COMPLETION_RATE:
        return 'blue';
      case ReportType.VEHICLE_HISTORY:
        return 'green';
      case ReportType.COST_ANALYSIS:
        return 'gold';
      case ReportType.MAINTENANCE_SUMMARY:
        return 'purple';
      case ReportType.MAINTENANCE_FORECAST:
        return 'magenta';
      default:
        return 'default';
    }
  };

  // 인쇄 기능을 위한 상태 추가
  const printReport = useCallback((report: LocalReport) => {
    setPrintLoading(true);
    
    // 인쇄할 내용을 생성
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.name} - 인쇄</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; }
          .report-header { text-align: center; margin-bottom: 30px; }
          .report-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .report-subtitle { font-size: 16px; color: #666; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #888; }
          .report-content { margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .report-footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">${report.name}</div>
          <div class="report-subtitle">${getReportTypeName(report.type)}</div>
          <div class="report-date">생성일: ${dayjs(report.createdAt).format('YYYY년 MM월 DD일')}</div>
        </div>
        <div class="report-content">
          <h2>보고서 요약</h2>
          <p>기간: ${dayjs(report.dateRange[0]).format('YYYY년 MM월 DD일')} ~ ${dayjs(report.dateRange[1]).format('YYYY년 MM월 DD일')}</p>
          ${report.vehicle ? `<p>차량: ${report.vehicle}</p>` : ''}
          ${report.maintenanceType ? `<p>정비 유형: ${report.maintenanceType}</p>` : ''}
          
          <h2>상세 정보</h2>
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>설명</th>
                <th>상태</th>
                <th>중요도</th>
              </tr>
            </thead>
            <tbody>
              ${report.data.map((item: any) => `
                <tr>
                  <td>${dayjs(item.date).format('YYYY-MM-DD')}</td>
                  <td>${item.description}</td>
                  <td>${item.status}</td>
                  <td>${item.priority}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="report-footer">
          <p>© ${new Date().getFullYear()} 차량 정비 관리 시스템 - 이 보고서는 시스템에서 자동 생성되었습니다.</p>
        </div>
        <div class="no-print">
          <button onclick="window.print();window.close();" style="padding: 10px 20px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer; display: block; margin: 20px auto;">인쇄하기</button>
        </div>
      </body>
      </html>
    `;
    
    // iframe을 사용하여 인쇄 내용 로드
    if (printFrameRef.current) {
      const iframe = printFrameRef.current;
      const iframeWindow = iframe.contentWindow;
      
      if (iframeWindow) {
        iframeWindow.document.open();
        iframeWindow.document.write(printContent);
        iframeWindow.document.close();
        
        // 인쇄 리소스 로딩이 완료되면 인쇄 다이얼로그 열기
        iframe.onload = () => {
          setPrintLoading(false);
          setTimeout(() => {
            iframeWindow.focus();
            iframeWindow.print();
          }, 500);
        };
      }
    } else {
      setPrintLoading(false);
      message.error('인쇄 초기화에 실패했습니다');
    }
  }, []);
  
  // 모달에서 인쇄하기
  const handlePrintFromModal = useCallback((report: LocalReport) => {
    printReport(report);
  }, [printReport]);

  // 보고서 목록 테이블 컬럼
  const columns = [
    {
      title: '보고서 이름',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LocalReport) => (
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
      render: (type: ReportType) => (
        <Tag color={getReportTypeColor(type)}>
          {getReportTypeName(type)}
        </Tag>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: LocalReport, b: LocalReport) => {
        return dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix();
      }
    },
    {
      title: '액션',
      key: 'action',
      render: (_, record: LocalReport) => (
        <Space size="small">
          <Tooltip title="상세 보기">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              onClick={() => showReportDetail(record)} 
            />
          </Tooltip>
          <Tooltip title="내보내기">
            <Button 
              icon={<ExportOutlined />} 
              size="small" 
              onClick={() => {
                setSelectedReportId(record.id);
                setExportModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="인쇄">
            <Button 
              icon={<PrinterOutlined />} 
              size="small" 
              onClick={() => printReport(record)}
              loading={selectedReport?.id === record.id && printLoading}
            />
          </Tooltip>
          <Tooltip title="이메일">
            <Button 
              icon={<MailOutlined />} 
              size="small" 
              onClick={() => {
                setSelectedReportId(record.id);
                setScheduleModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="삭제">
            <Popconfirm
              title="이 보고서를 삭제하시겠습니까?"
              onConfirm={() => deleteReport(record.id)}
              okText="삭제"
              cancelText="취소"
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
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

  // 샘플 차량 목록
  const sampleVehiclesDropdown = (
    <Menu>
      {sampleVehicles.map(vehicle => (
        <Menu.Item key={vehicle.id} onClick={() => setSelectedVehicle(vehicle.id)}>
          {vehicle.name}
        </Menu.Item>
      ))}
    </Menu>
  );

  // 정비 유형 목록
  const maintenanceTypesDropdown = (
    <Menu>
      {maintenanceTypes.map(type => (
        <Menu.Item key={type} onClick={() => setMaintenanceType(type)}>
          {type}
        </Menu.Item>
      ))}
    </Menu>
  );

  // 샘플 보고서 데이터
  const sampleReports: LocalReport[] = [
    // ... existing code ...
  ];

  // 템플릿 목록 로드
  const loadTemplates = () => {
    try {
      const templateList = reportService.getTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('템플릿 로드 오류:', error);
      message.error('템플릿 목록을 불러오는 데 실패했습니다.');
    }
  };
  
  // 템플릿 저장
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      message.error('템플릿 이름을 입력하세요');
      return;
    }
    
    try {
      const filter: ReportFilter = {
        startDate: formatDate(dateRange[0]),
        endDate: formatDate(dateRange[1]),
        vehicleId: selectedVehicle || undefined,
        maintenanceType: maintenanceType || undefined,
        priority: priority || undefined,
        status: status === 'all' ? undefined : status
      };
      
      const templateData = {
        name: templateName,
        type: reportType,
        filter,
        options: {
          includeCharts: includeCharts,
          includeRawData: includeRawData
        }
      };
      
      await reportService.saveTemplate(templateData);
      
      // 템플릿 목록 업데이트
      loadTemplates();
      
      message.success('템플릿이 저장되었습니다');
      setTemplateModalVisible(false);
      setTemplateName('');
    } catch (error) {
      console.error('템플릿 저장 오류:', error);
      message.error('템플릿 저장에 실패했습니다.');
    }
  };
  
  // 템플릿 불러오기
  const loadTemplate = (template: ReportTemplate) => {
    try {
      setReportType(template.type);
      
      if (template.filter?.startDate && template.filter?.endDate) {
        setDateRange([
          new Date(template.filter.startDate),
          new Date(template.filter.endDate)
        ]);
      }
      
      if (template.filter?.vehicleId) {
        setSelectedVehicle(template.filter.vehicleId);
      } else {
        setSelectedVehicle('');
      }
      
      if (template.filter?.maintenanceType) {
        setMaintenanceType(template.filter.maintenanceType);
      } else {
        setMaintenanceType('');
      }
      
      if (template.filter?.priority) {
        setPriority(template.filter.priority);
      } else {
        setPriority('');
      }
      
      if (template.filter?.status) {
        setStatus(template.filter.status === 'all' ? 'all' : template.filter.status);
      } else {
        setStatus('all');
      }
      
      if (template.options) {
        setIncludeCharts(template.options.includeCharts);
        setIncludeRawData(template.options.includeRawData);
      }
      
      // 템플릿 사용 시간 업데이트
      reportService.updateTemplateUsage(template.id);
      
      message.success(`'${template.name}' 템플릿을 불러왔습니다`);
      setSelectedTemplate(template);
    } catch (error) {
      console.error('템플릿 불러오기 오류:', error);
      message.error('템플릿을 불러오는 데 실패했습니다.');
    }
  };
  
  // 템플릿 삭제
  const deleteTemplate = async (templateId: string) => {
    try {
      const success = reportService.deleteTemplate(templateId);
      
      if (success) {
        // 템플릿 목록 업데이트
        loadTemplates();
        
        message.success('템플릿이 삭제되었습니다');
        
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        
        if (editingTemplate?.id === templateId) {
          setEditingTemplate(null);
          setTemplateManageModalVisible(false);
        }
      } else {
        message.error('템플릿 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
      message.error('템플릿 삭제 중 오류가 발생했습니다.');
    }
  };
  
  // 템플릿 이름 수정
  const updateTemplateName = async () => {
    if (!editingTemplate || !editingTemplateName.trim()) {
      message.error('템플릿 이름을 입력하세요');
      return;
    }
    
    try {
      const updatedTemplate = reportService.updateTemplate(
        editingTemplate.id,
        { name: editingTemplateName }
      );
      
      if (updatedTemplate) {
        // 템플릿 목록 업데이트
        loadTemplates();
        
        message.success('템플릿 이름이 수정되었습니다');
        
        if (selectedTemplate?.id === editingTemplate.id) {
          setSelectedTemplate(updatedTemplate);
        }
      } else {
        message.error('템플릿 이름 수정에 실패했습니다');
      }
      
      setEditingTemplate(null);
      setEditingTemplateName('');
      setTemplateManageModalVisible(false);
    } catch (error) {
      console.error('템플릿 이름 수정 오류:', error);
      message.error('템플릿 이름 수정 중 오류가 발생했습니다.');
    }
  };
  
  // 템플릿 관리 모달 열기
  const openTemplateManageModal = () => {
    loadTemplates(); // 최신 템플릿 목록 로드
    setTemplateManageModalVisible(true);
  };
  
  // 템플릿 편집 시작
  const startEditingTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setEditingTemplateName(template.name);
  };
  
  // 템플릿으로 보고서 생성
  const generateReportFromTemplate = async (templateId: string) => {
    setLoading(true);
    
    try {
      const report = await reportService.generateReportFromTemplate(templateId);
      
      if (report) {
        // 보고서 생성 성공 처리
        message.success('보고서가 생성되었습니다');
        // 보고서 상세 모달 열기
        showReportDetail(report as any);
      } else {
        message.error('보고서 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('템플릿으로 보고서 생성 오류:', error);
      message.error('템플릿으로 보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 템플릿 드롭다운 메뉴 렌더링
  const renderTemplateMenu = () => {
    return (
      <Menu>
        {templates.length > 0 ? (
          <>
            {templates.map(template => (
              <Menu.Item key={template.id} onClick={() => loadTemplate(template)}>
                <Space>
                  <CheckOutlined style={{ visibility: selectedTemplate?.id === template.id ? 'visible' : 'hidden' }} />
                  {template.name}
                  <Tag color={getReportTypeColor(template.type)} style={{ marginLeft: 8 }}>
                    {getReportTypeName(template.type)}
                  </Tag>
                </Space>
              </Menu.Item>
            ))}
            <Menu.Divider />
          </>
        ) : (
          <Menu.Item disabled>저장된 템플릿이 없습니다</Menu.Item>
        )}
        <Menu.Item onClick={() => setTemplateModalVisible(true)}>
          <Space>
            <SaveOutlined />
            현재 설정을 템플릿으로 저장
          </Space>
        </Menu.Item>
        <Menu.Item onClick={openTemplateManageModal}>
          <Space>
            <EditOutlined />
            템플릿 관리
          </Space>
        </Menu.Item>
      </Menu>
    );
  };

  // 템플릿 관리 모달의 템플릿 목록 렌더링
  const renderTemplateList = () => {
    return (
      <List
        dataSource={templates}
        renderItem={(template) => (
          <List.Item
            actions={[
              <Button 
                icon={<ToolOutlined />} 
                onClick={() => startEditingTemplate(template)} 
                type="link"
              >
                편집
              </Button>,
              <Button 
                danger 
                icon={<CloseOutlined />} 
                onClick={() => deleteTemplate(template.id)} 
                type="link"
              >
                삭제
              </Button>,
              <Button 
                type="link" 
                onClick={() => {
                  loadTemplate(template);
                  setTemplateManageModalVisible(false);
                }}
              >
                사용하기
              </Button>
            ]}
          >
            <List.Item.Meta
              title={template.name}
              description={
                <div>
                  <div>유형: {getReportTypeName(template.type)}</div>
                  <div>
                    생성일: {dayjs(template.createdAt).format('YYYY-MM-DD')}
                  </div>
                  {template.lastUsed && (
                    <div>
                      마지막 사용: {dayjs(template.lastUsed).format('YYYY-MM-DD HH:mm')}
                    </div>
                  )}
                  <div>
                    기간: {template.filter?.startDate} ~ {template.filter?.endDate}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <Card title="정비 보고서" className="report-dashboard">
      {/* 인쇄용 iframe 추가 */}
      <iframe 
        ref={printFrameRef}
        style={{ position: 'absolute', width: '0', height: '0', border: '0' }}
        title="Print Frame"
      />
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="보고서 생성" key="create">
          <div className="report-form">
            <Form layout="vertical">
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <Dropdown overlay={renderTemplateMenu()} trigger={['click']}>
                  <Button icon={<FolderOpenOutlined />}>
                    {selectedTemplate ? selectedTemplate.name : '템플릿'} <DownloadOutlined />
                  </Button>
                </Dropdown>
              </div>
              
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
                  value={[dayjs(dateRange[0]), dayjs(dateRange[1])]} 
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
                    {sampleVehiclesDropdown}
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
                  {maintenanceTypesDropdown}
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
            {renderFilterSection()}
            
            <Spin spinning={loading}>
              {filteredReports.length === 0 ? (
                <Empty description={
                  searchText || filterReportType || (filterDateRange[0] && filterDateRange[1]) 
                    ? "검색 결과가 없습니다"
                    : "생성된 보고서가 없습니다"
                } />
              ) : (
                <Table
                  dataSource={filteredReports}
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

      {/* 템플릿 저장 모달 */}
      <Modal
        title="보고서 템플릿 저장"
        visible={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        onOk={saveTemplate}
        okText="저장"
        cancelText="취소"
      >
        <Form layout="vertical">
          <Form.Item
            label="템플릿 이름"
            required
            rules={[{ required: true, message: '템플릿 이름을 입력하세요' }]}
          >
            <Input
              placeholder="템플릿 이름 입력"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={50}
              suffix={<span style={{ color: '#ccc' }}>{templateName.length}/50</span>}
            />
          </Form.Item>
          
          <Form.Item label="현재 보고서 설정">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="보고서 유형">{getReportTypeName(reportType)}</Descriptions.Item>
              <Descriptions.Item label="기간">
                {`${formatDate(dateRange[0])} ~ ${formatDate(dateRange[1])}`}
              </Descriptions.Item>
              {selectedVehicle && (
                <Descriptions.Item label="차량 ID">{selectedVehicle}</Descriptions.Item>
              )}
              {maintenanceType && (
                <Descriptions.Item label="정비 유형">{maintenanceType}</Descriptions.Item>
              )}
              {priority && (
                <Descriptions.Item label="우선순위">{priority}</Descriptions.Item>
              )}
              <Descriptions.Item label="상태">{status}</Descriptions.Item>
            </Descriptions>
          </Form.Item>
          
          <Form.Item label="보고서 옵션">
            <Checkbox
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
            >
              차트 포함
            </Checkbox>
            <Checkbox
              checked={includeRawData}
              onChange={(e) => setIncludeRawData(e.target.checked)}
              style={{ marginLeft: 16 }}
            >
              원본 데이터 포함
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 템플릿 관리 모달 */}
      <Modal
        title="템플릿 관리"
        visible={templateManageModalVisible}
        onCancel={() => setTemplateManageModalVisible(false)}
        footer={null}
        width={700}
      >
        {editingTemplate ? (
          <div style={{ marginBottom: 16 }}>
            <Input
              value={editingTemplateName}
              onChange={(e) => setEditingTemplateName(e.target.value)}
              style={{ width: 'calc(100% - 8px)', marginBottom: 8 }}
              placeholder="템플릿 이름"
            />
            <Space>
              <Button type="primary" onClick={updateTemplateName}>저장</Button>
              <Button onClick={() => {
                setEditingTemplate(null);
                setEditingTemplateName('');
              }}>취소</Button>
            </Space>
          </div>
        ) : templates.length === 0 ? (
          <Empty description="저장된 템플릿이 없습니다" />
        ) : (
          renderTemplateList()
        )}
      </Modal>
      
      {/* 보고서 상세 모달 */}
      <ReportDetailModal
        visible={detailModalVisible}
        report={selectedReport}
        onClose={() => setDetailModalVisible(false)}
        onExport={handleExportFromModal}
        onPrint={handlePrintFromModal}
        loading={loading}
      />
    </Card>
  );
};

export default ReportDashboard; 