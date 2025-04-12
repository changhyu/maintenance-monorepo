import React, { useState } from 'react';

import {
  DownOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Menu,
  Modal,
  Form,
  Select,
  Input,
  Tabs,
  Checkbox,
  message,
  Spin,
  Radio,
  Row,
  Col,
  Typography
} from 'antd';
import FileSaver from 'file-saver';
// 필요한 경우에만 주석 해제하여 사용
// import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

import { exportData, ExportFormat } from '../../utils/exportUtils';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

// 보고서 유형 정의
export enum ReportType {
  VEHICLE_STATUS = 'vehicle_status',
  MAINTENANCE_HISTORY = 'maintenance_history',
  GEOFENCE_ANALYSIS = 'geofence_analysis',
  FLEET_SUMMARY = 'fleet_summary',
  COST_ANALYSIS = 'cost_analysis',
  CUSTOM = 'custom'
}

// 보고서 템플릿 정의
export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  fields: string[];
  groupBy?: string[];
  sortBy?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'A3' | 'Letter';
  includeCharts?: boolean;
  includeImages?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
}

// 기본 템플릿 목록
const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'vehicle-status-summary',
    name: '차량 상태 요약',
    type: ReportType.VEHICLE_STATUS,
    description: '모든 차량의 현재 상태 및 기본 정보를 포함한 요약 보고서',
    fields: ['id', 'name', 'status', 'lastMaintenance', 'mileage', 'healthScore'],
    orientation: 'portrait',
    paperSize: 'A4',
    includeCharts: true,
    includeHeader: true,
    includeFooter: true
  },
  {
    id: 'maintenance-history-detail',
    name: '정비 이력 상세',
    type: ReportType.MAINTENANCE_HISTORY,
    description: '각 차량의 정비 이력 상세 정보를 포함한 보고서',
    fields: [
      'vehicleId',
      'vehicleName',
      'date',
      'type',
      'description',
      'cost',
      'shop',
      'technician'
    ],
    groupBy: ['vehicleId'],
    sortBy: 'date',
    orientation: 'landscape',
    paperSize: 'A4',
    includeCharts: false,
    includeHeader: true,
    includeFooter: true
  },
  {
    id: 'geofence-activity',
    name: '지오펜스 활동 분석',
    type: ReportType.GEOFENCE_ANALYSIS,
    description: '지오펜스 출입 이벤트 및 체류 시간 분석 보고서',
    fields: [
      'geofenceId',
      'geofenceName',
      'vehicleId',
      'vehicleName',
      'eventType',
      'timestamp',
      'dwellTime'
    ],
    groupBy: ['geofenceId', 'vehicleId'],
    orientation: 'landscape',
    paperSize: 'A4',
    includeCharts: true,
    includeHeader: true,
    includeFooter: true
  }
];

// 보고서 옵션 인터페이스
export interface ReportOptions {
  templateId: string;
  format: ExportFormat;
  paperSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  customTitle?: string;
  customFields?: string[];
  dateRange?: [Date, Date];
}

// 일반 데이터 객체 인터페이스
export interface DataItem {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export interface ReportGeneratorProps {
  /** 보고서 생성에 사용할 데이터 */
  data: DataItem[];
  /** 사용 가능한 보고서 유형 목록 */
  availableTypes?: ReportType[];
  /** 사용자 정의 템플릿 목록 */
  customTemplates?: ReportTemplate[];
  /** 파일명 접두사 */
  filenamePrefix?: string;
  /** 보고서 생성 후 콜백 함수 */
  onReportGenerated?: (filename: string, format: ExportFormat) => void;
  /** 버튼 텍스트 */
  buttonText?: string;
  /** 버튼 비활성화 여부 */
  disabled?: boolean;
  /** 회사 로고 URL */
  companyLogo?: string;
  /** 버튼 스타일 */
  buttonStyle?: React.CSSProperties;
}

/**
 * 고급 보고서 생성 컴포넌트
 * 다양한 형식과 템플릿을 지원하는 보고서 생성 인터페이스 제공
 */
const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  data,
  availableTypes = Object.values(ReportType),
  customTemplates = [],
  filenamePrefix = 'report',
  onReportGenerated,
  buttonText = '보고서 생성',
  disabled = false,
  companyLogo,
  buttonStyle
}) => {
  // 상태 관리
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm();

  // 모든 템플릿 (기본 + 사용자 정의)
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates].filter(template =>
    availableTypes.includes(template.type)
  );

  // 모달 열기
  const showModal = () => {
    setModalVisible(true);
    if (allTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(allTemplates[0].id);
      form.setFieldsValue({
        templateId: allTemplates[0].id,
        format: 'pdf',
        paperSize: allTemplates[0].paperSize || 'A4',
        orientation: allTemplates[0].orientation || 'portrait'
      });
    }
  };

  // 모달 닫기
  const handleCancel = () => {
    setModalVisible(false);
  };

  // 템플릿 변경 처리
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      form.setFieldsValue({
        paperSize: template.paperSize || 'A4',
        orientation: template.orientation || 'portrait',
        includeCharts: template.includeCharts || false,
        includeHeader: template.includeHeader || false,
        includeFooter: template.includeFooter || false
      });
    }
  };

  // 보고서 생성
  const handleGenerate = async (values: ReportOptions) => {
    setLoading(true);
    try {
      const template = allTemplates.find(t => t.id === values.templateId);
      if (!template || !data || data.length === 0) {
        message.error('보고서를 생성할 수 없습니다.');
        setLoading(false);
        return;
      }

      // 템플릿에 따라 데이터 필터링 및 처리
      const processedData = processDataForTemplate(data, template, values);

      // 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `${filenamePrefix}_${template.type}_${timestamp}`;

      // 데이터 내보내기
      exportData(processedData, filename, values.format || 'pdf');

      message.success(`${template.name} 보고서가 성공적으로 생성되었습니다.`);

      // 콜백 함수 호출
      if (onReportGenerated) {
        onReportGenerated(filename, values.format || 'pdf');
      }

      setModalVisible(false);
    } catch (error) {
      console.error('보고서 생성 중 오류 발생:', error);
      message.error('보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 템플릿에 따른 데이터 처리
  const processDataForTemplate = (
    rawData: DataItem[],
    template: ReportTemplate,
    options: ReportOptions
  ): DataItem[] => {
    // 템플릿 필드에 따라 데이터 필터링
    const processedData = rawData.map(item => {
      const filteredItem: Record<string, any> = {};
      template.fields.forEach(field => {
        if (item[field] !== undefined) {
          filteredItem[field] = item[field];
        }
      });
      return filteredItem;
    });

    // 그룹화 처리
    if (template.groupBy && template.groupBy.length > 0) {
      // 그룹화 로직 구현
      // 간단한 예시로 첫 번째 그룹화 필드를 기준으로 정렬만 수행
      processedData.sort((a, b) => {
        const fieldName = template.groupBy![0];
        const valueA = a[fieldName];
        const valueB = b[fieldName];
        
        if (valueA < valueB) {
          return -1;
        }
        if (valueA > valueB) {
          return 1;
        }
        return 0;
      });
    }

    // 정렬 처리
    if (template.sortBy) {
      processedData.sort((a, b) => {
        const valueA = a[template.sortBy!];
        const valueB = b[template.sortBy!];
        
        if (valueA < valueB) {
          return -1;
        }
        if (valueA > valueB) {
          return 1;
        }
        return 0;
      });
    }

    return processedData;
  };

  // 메뉴 항목 클릭 핸들러
  const handleMenuClick = (e: any) => {
    // 포맷 설정 후 모달 표시
    setExportFormat(e.key as ExportFormat);
    showModal();
  };

  // 포맷 변경 핸들러
  const handleFormatChange = (format: ExportFormat) => {
    setExportFormat(format);
    form.setFieldsValue({ format });
  };

  // PDF 생성 함수
  function createPdf(template: ReportTemplate, processedData: any[], companyLogo?: string) {
    const doc = new jsPDF({
      orientation: template.orientation || 'portrait',
      unit: 'mm',
      format: template.paperSize || 'a4'
    });

    // 헤더 추가
    if (template.includeHeader) {
      doc.setFontSize(16);
      doc.text(template.name || '보고서', 14, 15);

      // 회사 로고 추가 (있을 경우)
      if (companyLogo || template.logoUrl) {
        // 로고 이미지 처리 - 실제 구현에서는 이미지 로드 후 추가 필요
        // doc.addImage(logoData, 'PNG', 150, 10, 30, 15);
      }

      doc.setFontSize(10);
      doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 14, 25);
      if (template.headerText) {
        doc.text(template.headerText, 14, 30);
      }

      doc.line(10, 35, doc.internal.pageSize.width - 10, 35);
    }

    // 테이블 헤더 생성
    const headers = template.fields.map(field => {
      // 필드명을 사용자 친화적으로 변환 (예: camelCase -> 공백으로 분리된 단어)
      return field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    });

    const rows = processedData.map(item =>
      template.fields.map(field => item[field]?.toString() || '')
    );

    // 테이블 추가
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: template.includeHeader ? 40 : 10,
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
      didDrawPage: (data) => {
        // 페이지가 그려질 때마다 푸터 추가
        if (template.includeFooter) {
          doc.setFontSize(8);
          const { pageSize } = doc.internal;
          const pageHeight = pageSize.height || pageSize.getHeight();

          // 푸터 라인
          doc.line(10, pageHeight - 20, doc.internal.pageSize.width - 10, pageHeight - 20);

          // 푸터 텍스트
          doc.text(template.footerText || '자동 생성된 보고서', 14, pageHeight - 15);

          // 페이지 번호
          doc.text(
            `페이지 ${data.pageNumber} / ${data.pageCount}`,
            doc.internal.pageSize.width - 30,
            pageHeight - 15
          );
        }
      }
    });

    return doc;
  }

  // 엑셀 생성 함수
  function createExcel(template: ReportTemplate, processedData: any[]) {
    const workbook = XLSX.utils.book_new();

    // 데이터를 시트에 변환
    const worksheet = XLSX.utils.json_to_sheet(processedData);

    // 열 너비 설정
    const colWidths = template.fields.map(field => ({ wch: Math.max(field.length * 1.5, 10) }));
    worksheet['!cols'] = colWidths;

    // 헤더 스타일링을 위한 사용자 정의 처리 (XLSX에서는 직접적인 스타일링이 제한적임)
    // 실제 구현에서는 exceljs와 같은 더 강력한 라이브러리 사용 권장

    // 워크시트 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, template.name || '보고서');

    return workbook;
  }

  // CSV 생성 함수
  function createCsv(processedData: any[]) {
    if (processedData.length === 0) {
      return '';
    }

    // 헤더 추출
    const headers = Object.keys(processedData[0]);

    // 헤더 행 생성 (따옴표로 감싸기)
    const headerRow = headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',');

    // 데이터 행 생성
    const rows = processedData.map(item => {
      return headers
        .map(header => {
          const cell = item[header] ?? '';

          // 문자열 값이면 따옴표로 감싸고 내부 따옴표는 이스케이프
          if (typeof cell === 'string') {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          // 숫자, 불리언 등은 그대로 출력
          return cell;
        })
        .join(',');
    });

    // 최종 CSV 문자열 반환 (헤더 + 데이터 행)
    return [headerRow, ...rows].join('\n');
  }

  // 보고서 형식에 따른 드롭다운 메뉴
  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="pdf" icon={<FilePdfOutlined />}>
        PDF 보고서
      </Menu.Item>
      <Menu.Item key="excel" icon={<FileExcelOutlined />}>
        Excel 보고서
      </Menu.Item>
      <Menu.Item key="csv" icon={<FileTextOutlined />}>
        CSV 내보내기
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} disabled={disabled}>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          style={{ ...buttonStyle }}
          disabled={disabled}
        >
          {buttonText} <DownOutlined />
        </Button>
      </Dropdown>

      <Modal
        title="보고서 생성"
        visible={modalVisible}
        onCancel={handleCancel}
        width={800}
        footer={[
          <Button key="back" onClick={handleCancel}>
            취소
          </Button>,
          <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
            생성
          </Button>
        ]}
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerate}
            initialValues={{
              templateId: selectedTemplate,
              format: exportFormat,
              paperSize: 'A4',
              orientation: 'portrait',
              includeCharts: true,
              includeHeader: true,
              includeFooter: true
            }}
          >
            <Tabs defaultActiveKey="basic">
              <TabPane tab="기본 설정" key="basic">
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="templateId"
                      label="보고서 템플릿"
                      rules={[{ required: true, message: '템플릿을 선택해주세요' }]}
                    >
                      <Select onChange={handleTemplateChange}>
                        {allTemplates.map(template => (
                          <Option key={template.id} value={template.id}>
                            {template.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="format"
                      label="출력 형식"
                      rules={[{ required: true, message: '형식을 선택해주세요' }]}
                    >
                      <Radio.Group onChange={e => handleFormatChange(e.target.value)}>
                        <Radio.Button value="pdf">
                          <FilePdfOutlined /> PDF
                        </Radio.Button>
                        <Radio.Button value="excel">
                          <FileExcelOutlined /> Excel
                        </Radio.Button>
                        <Radio.Button value="csv">
                          <FileTextOutlined /> CSV
                        </Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>

                {/* PDF 옵션 (PDF 형식 선택 시에만 표시) */}
                {exportFormat === 'pdf' && (
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item name="paperSize" label="용지 크기">
                        <Select>
                          <Option value="a4">A4</Option>
                          <Option value="a3">A3</Option>
                          <Option value="letter">Letter</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="orientation" label="방향">
                        <Radio.Group>
                          <Radio value="portrait">세로</Radio>
                          <Radio value="landscape">가로</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* 템플릿 설명 표시 */}
                {selectedTemplate && (
                  <div style={{ marginBottom: 20 }}>
                    <Title level={5}>템플릿 정보</Title>
                    <Text>
                      {allTemplates.find(t => t.id === selectedTemplate)?.description || ''}
                    </Text>
                  </div>
                )}
              </TabPane>

              <TabPane tab="추가 옵션" key="advanced">
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item name="includeCharts" valuePropName="checked">
                      <Checkbox>차트 포함</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="includeHeader" valuePropName="checked">
                      <Checkbox>헤더 포함</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="includeFooter" valuePropName="checked">
                      <Checkbox>푸터 포함</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="headerText" label="헤더 텍스트">
                  <Input placeholder="보고서 헤더에 표시할 텍스트" />
                </Form.Item>

                <Form.Item name="footerText" label="푸터 텍스트">
                  <Input placeholder="보고서 푸터에 표시할 텍스트" />
                </Form.Item>
              </TabPane>

              <TabPane tab="배포 옵션" key="distribution">
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item name="emailReport" valuePropName="checked">
                      <Checkbox>이메일로 보고서 전송</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="scheduledReport" valuePropName="checked">
                      <Checkbox>정기 보고서로 예약</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="emailList"
                  label="수신자 이메일"
                  rules={[
                    {
                      type: 'array',
                      validator: (_, value) => {
                        if (!value) {
                          return Promise.resolve();
                        }
                        const emails = value.split(',').map((e: string) => e.trim());
                        const invalidEmails = emails.filter((e: string) => !/.+@.+\..+/.test(e));
                        return invalidEmails.length === 0
                          ? Promise.resolve()
                          : Promise.reject(new Error('잘못된 이메일 형식이 있습니다'));
                      }
                    }
                  ]}
                >
                  <Input placeholder="여러 이메일은 쉼표로 구분 (예: email1@example.com, email2@example.com)" />
                </Form.Item>

                <Form.Item name="scheduleFrequency" label="보고서 예약 주기">
                  <Select placeholder="보고서 주기 선택">
                    <Option value="daily">매일</Option>
                    <Option value="weekly">매주</Option>
                    <Option value="monthly">매월</Option>
                    <Option value="quarterly">분기별</Option>
                  </Select>
                </Form.Item>
              </TabPane>
            </Tabs>
          </Form>
        </Spin>
      </Modal>
    </>
  );
};

export default ReportGenerator;
