import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  Chip,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  ListItemText,
  List,
  ListItem
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  Description as PdfIcon,
  InsertDriveFile as ExcelIcon,
  DataArray as CsvIcon,
  Code as JsonIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon
} from '@mui/icons-material';

import { ExportOptionsForm } from '../reports';
import { Report, ReportType, ReportFormat, ExportOptions } from '../../services/reportService';
import { exportService } from '../../services/exportService';
import * as indexedDBUtils from '../../utils/indexedDBUtils';

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
  paperSize?: 'a4' | 'letter' | 'legal';
  includeCharts?: boolean;
  includeImages?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
}

// 기본 템플릿 목록 - ReportType 열거형에 맞게 업데이트
const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'vehicle-status-summary',
    name: '차량 상태 요약',
    type: ReportType.VEHICLE_HISTORY,
    description: '모든 차량의 현재 상태 및 기본 정보를 포함한 요약 보고서',
    fields: ['id', 'name', 'status', 'lastMaintenance', 'mileage', 'healthScore'],
    orientation: 'portrait',
    paperSize: 'a4',
    includeCharts: true,
    includeHeader: true,
    includeFooter: true
  },
  {
    id: 'maintenance-history-detail',
    name: '정비 이력 상세',
    type: ReportType.MAINTENANCE_SUMMARY,
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
    paperSize: 'a4',
    includeCharts: false,
    includeHeader: true,
    includeFooter: true
  },
  {
    id: 'cost-analysis',
    name: '비용 분석',
    type: ReportType.COST_ANALYSIS,
    description: '정비 비용 분석 보고서',
    fields: [
      'vehicleId',
      'vehicleName',
      'maintenanceType',
      'date',
      'cost',
      'parts',
      'labor'
    ],
    groupBy: ['vehicleId'],
    sortBy: 'date',
    orientation: 'portrait',
    paperSize: 'a4',
    includeCharts: true,
    includeHeader: true,
    includeFooter: true
  }
];

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
  onReportGenerated?: (filename: string, format: ReportFormat) => void;
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
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  
  // 새 템플릿 상태
  const [createTemplateOpen, setCreateTemplateOpen] = useState<boolean>(false);
  const [newTemplate, setNewTemplate] = useState<Partial<ReportTemplate>>({
    name: '',
    type: ReportType.VEHICLE_HISTORY,
    description: '',
    fields: [],
    orientation: 'portrait',
    paperSize: 'a4',
    includeCharts: true,
    includeHeader: true,
    includeFooter: true
  });
  
  // 정기 보고서 상태
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState<boolean>(false);
  const [scheduleOptions, setScheduleOptions] = useState({
    templateId: '',
    frequency: 'weekly',
    dayOfWeek: 1, // 월요일
    hour: 9,
    emailNotification: true,
    saveToIndexedDB: true
  });
  
  // 보고서 템플릿 검색 상태
  const [templateSearchTerm, setTemplateSearchTerm] = useState<string>('');
  
  // 최근 생성된 보고서 상태
  const [recentReports, setRecentReports] = useState<any[]>([]);
  
  // 오프라인 저장된 보고서 로딩
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const reports = await exportService.getReportsFromIndexedDB();
        setRecentReports(reports.slice(0, 5)); // 최근 5개만 표시
      } catch (error) {
        console.error('저장된 보고서 로드 실패:', error);
      }
    };
    
    loadSavedReports();
  }, []);
  
  // 필터링된 템플릿 목록
  const filteredTemplates = React.useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...customTemplates]
      .filter(template => 
        availableTypes.includes(template.type) && 
        (templateSearchTerm === '' || 
         template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) || 
         template.description.toLowerCase().includes(templateSearchTerm.toLowerCase()))
      );
  }, [availableTypes, customTemplates, templateSearchTerm]);
  
  // 탭 변경 핸들러
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 모든 템플릿 (기본 + 사용자 정의)
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates].filter(template =>
    availableTypes.includes(template.type)
  );

  // 다이얼로그 열기
  const handleOpenDialog = () => {
    setDialogOpen(true);
    if (allTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(allTemplates[0].id);
    }
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError(null);
  };

  // 템플릿 변경 처리
  const handleTemplateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedTemplate(event.target.value as string);
  };

  // 템플릿에 따른 데이터 처리
  const processDataForTemplate = (
    rawData: DataItem[],
    template: ReportTemplate
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

  // 미리보기 다이얼로그 열기
  const handleOpenPreview = async (exportOptions: ExportOptions) => {
    if (!selectedTemplate) {
      setError('템플릿을 선택해주세요.');
      return;
    }

    const template = allTemplates.find(t => t.id === selectedTemplate);
    if (!template || !data || data.length === 0) {
      setError('보고서를 생성할 수 없습니다.');
      return;
    }

    setPreviewLoading(true);
    setError(null);

    try {
      // 미리보기용 옵션 설정 (항상 PDF로 설정)
      const previewOptions: ExportOptions = {
        ...exportOptions,
        format: ReportFormat.PDF,
        includeCharts: template.includeCharts || exportOptions.includeCharts,
        paperSize: template.paperSize || exportOptions.paperSize,
        landscape: template.orientation === 'landscape' || exportOptions.landscape,
        preview: true
      };

      // exportService를 사용하여 미리보기 생성
      const previewBlob = await exportService.previewTemplateReport(
        data,
        template,
        previewOptions
      );

      // Blob을 URL로 변환
      const previewBlobUrl = URL.createObjectURL(previewBlob);
      setPreviewUrl(previewBlobUrl);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('보고서 미리보기 생성 중 오류 발생:', error);
      setError('보고서 미리보기를 생성할 수 없습니다.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 미리보기 다이얼로그 닫기
  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
    // URL 객체 메모리 정리
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // 보고서 내보내기 처리
  const handleExport = async (exportOptions: ExportOptions) => {
    if (!selectedTemplate) {
      setError('템플릿을 선택해주세요.');
      return;
    }

    const template = allTemplates.find(t => t.id === selectedTemplate);
    if (!template || !data || data.length === 0) {
      setError('보고서를 생성할 수 없습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `${filenamePrefix}_${template.type}_${timestamp}`;

      // 로컬 저장 옵션이 켜져 있으면 IndexedDB에도 저장
      if (exportOptions.saveToIndexedDB) {
        try {
          // 보고서 데이터를 처리하여 IndexedDB에 저장
          const processedData = processDataForTemplate(data, template);
          
          const reportData = {
            id: `report_${Date.now()}`,
            name: template.name,
            type: template.type,
            createdAt: new Date().toISOString(),
            data: processedData,
            templateId: template.id,
            exportOptions
          };
          
          // IndexedDB에 저장
          await exportService.saveReportToIndexedDB(reportData);
          
          console.log('보고서가 오프라인 저장소에 저장되었습니다.');
        } catch (dbError) {
          console.error('보고서 로컬 저장 중 오류 발생:', dbError);
          // 로컬 저장 실패는 전체 내보내기를 중단하지 않음
        }
      }

      // 템플릿 기반으로 보고서 내보내기
      await exportService.exportTemplateReport(
        data,
        template,
        exportOptions
      );

      // 성공 메시지 및 콜백 처리
      console.log(`${template.name} 보고서가 성공적으로 생성되었습니다.`);
      
      // 콜백 함수 호출
      if (onReportGenerated) {
        onReportGenerated(filename, exportOptions.format);
      }

      // 다이얼로그 닫기
      handleCloseDialog();
    } catch (error) {
      console.error('보고서 생성 중 오류 발생:', error);
      setError('보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 생성 다이얼로그 열기
  const handleOpenCreateTemplate = () => {
    setCreateTemplateOpen(true);
  };
  
  // 템플릿 생성 다이얼로그 닫기
  const handleCloseCreateTemplate = () => {
    setCreateTemplateOpen(false);
  };
  
  // 새 템플릿 필드 변경 핸들러
  const handleNewTemplateChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setNewTemplate(prev => ({
      ...prev,
      [name as string]: value
    }));
  };
  
  // 템플릿 필드 토글 핸들러
  const handleFieldToggle = (field: string) => {
    setNewTemplate(prev => {
      const currentFields = prev.fields || [];
      const newFields = currentFields.includes(field)
        ? currentFields.filter(f => f !== field)
        : [...currentFields, field];
      
      return {
        ...prev,
        fields: newFields
      };
    });
  };
  
  // 새 템플릿 저장 핸들러
  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.fields?.length) {
      setError('템플릿 이름과 하나 이상의 필드를 선택해야 합니다.');
      return;
    }
    
    try {
      // 템플릿 저장 로직 구현
      const fullTemplate: ReportTemplate = {
        id: `custom_${Date.now()}`,
        name: newTemplate.name || '새 템플릿',
        type: newTemplate.type || ReportType.VEHICLE_HISTORY,
        description: newTemplate.description || '',
        fields: newTemplate.fields || [],
        groupBy: newTemplate.groupBy,
        sortBy: newTemplate.sortBy,
        orientation: newTemplate.orientation as 'portrait' | 'landscape',
        paperSize: newTemplate.paperSize as 'a4' | 'letter' | 'legal',
        includeCharts: newTemplate.includeCharts || false,
        includeImages: newTemplate.includeImages || false,
        includeHeader: newTemplate.includeHeader || false,
        includeFooter: newTemplate.includeFooter || false,
        headerText: newTemplate.headerText,
        footerText: newTemplate.footerText,
        logoUrl: newTemplate.logoUrl || companyLogo
      };
      
      // IndexedDB에 템플릿 저장
      await indexedDBUtils.saveData('reportTemplates', fullTemplate);
      
      // 성공 메시지 또는 콜백 처리
      console.log('새 템플릿이 저장되었습니다:', fullTemplate.name);
      
      // 템플릿 생성 다이얼로그 닫기
      handleCloseCreateTemplate();
      
      // 새 템플릿 선택
      setSelectedTemplate(fullTemplate.id);
      
      // 상태 초기화
      setNewTemplate({
        name: '',
        type: ReportType.VEHICLE_HISTORY,
        description: '',
        fields: [],
        orientation: 'portrait',
        paperSize: 'a4',
        includeCharts: true,
        includeHeader: true,
        includeFooter: true
      });
    } catch (error) {
      console.error('템플릿 저장 실패:', error);
      setError('템플릿을 저장하는 중 오류가 발생했습니다.');
    }
  };
  
  // 정기 보고서 다이얼로그 열기
  const handleOpenScheduleDialog = () => {
    if (selectedTemplate) {
      setScheduleOptions(prev => ({
        ...prev,
        templateId: selectedTemplate
      }));
      setScheduleDialogOpen(true);
    } else {
      setError('정기 보고서를 설정하려면 먼저 템플릿을 선택해주세요.');
    }
  };
  
  // 정기 보고서 다이얼로그 닫기
  const handleCloseScheduleDialog = () => {
    setScheduleDialogOpen(false);
  };
  
  // 정기 보고서 옵션 변경 핸들러
  const handleScheduleOptionsChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, checked } = e.target as any;
    setScheduleOptions(prev => ({
      ...prev,
      [name as string]: checked !== undefined ? checked : value
    }));
  };
  
  // 정기 보고서 저장 핸들러
  const handleSaveSchedule = async () => {
    try {
      // 정기 보고서 설정 저장 로직 구현
      const scheduleConfig = {
        id: `schedule_${Date.now()}`,
        templateId: scheduleOptions.templateId,
        frequency: scheduleOptions.frequency,
        dayOfWeek: scheduleOptions.dayOfWeek,
        hour: scheduleOptions.hour,
        emailNotification: scheduleOptions.emailNotification,
        saveToIndexedDB: scheduleOptions.saveToIndexedDB,
        createdAt: new Date().toISOString(),
        lastRun: null,
        nextRun: null // 다음 실행 시간은 별도 로직으로 계산
      };
      
      // IndexedDB에 정기 보고서 설정 저장
      await indexedDBUtils.saveData('reportSchedules', scheduleConfig);
      
      // 성공 메시지 또는 콜백 처리
      console.log('정기 보고서 설정이 저장되었습니다');
      
      // 다이얼로그 닫기
      handleCloseScheduleDialog();
    } catch (error) {
      console.error('정기 보고서 설정 저장 실패:', error);
      setError('정기 보고서 설정을 저장하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<DownloadIcon />}
        onClick={handleOpenDialog}
        disabled={disabled || data.length === 0}
        style={buttonStyle}
      >
        {buttonText}
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Typography variant="h6">보고서 생성</Typography>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Box sx={{ color: 'error.main', mb: 2 }}>
              {error}
            </Box>
          )}
          
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="템플릿 선택" />
            <Tab label="최근 보고서" />
          </Tabs>
          
          {tabValue === 0 ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <TextField
                  placeholder="템플릿 검색..."
                  variant="outlined"
                  size="small"
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  sx={{ width: '60%' }}
                />
                <Box>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreateTemplate}
                    sx={{ mr: 1 }}
                  >
                    새 템플릿
                  </Button>
                  <Button
                    startIcon={<ScheduleIcon />}
                    onClick={handleOpenScheduleDialog}
                    disabled={!selectedTemplate}
                  >
                    정기 설정
                  </Button>
                </Box>
              </Box>
            
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="template-select-label">템플릿 선택</InputLabel>
                  <Select
                    labelId="template-select-label"
                    value={selectedTemplate || ''}
                    onChange={handleTemplateChange as any}
                    label="템플릿 선택"
                  >
                    {filteredTemplates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name} ({template.description})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {selectedTemplate && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">보고서 내보내기 옵션</Typography>
                    <Tooltip title="미리보기">
                      <IconButton 
                        color="primary" 
                        onClick={() => {
                          const template = allTemplates.find(t => t.id === selectedTemplate);
                          if (template) {
                            handleOpenPreview({
                              format: ReportFormat.PDF,
                              paperSize: template.paperSize || 'a4',
                              landscape: template.orientation === 'landscape',
                              includeCharts: template.includeCharts || true,
                              includeRawData: true
                            });
                          }
                        }}
                        disabled={previewLoading || isLoading}
                      >
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <ExportOptionsForm 
                    onExport={handleExport}
                    isLoading={isLoading}
                  />
                </>
              )}
            </>
          ) : (
            // 최근 보고서 탭
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                최근 생성된 보고서
              </Typography>
              {recentReports.length > 0 ? (
                <List>
                  {recentReports.map(report => (
                    <ListItem
                      key={report.id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => {
                            // 저장된 보고서로 내보내기 옵션 설정
                            const exportOptions = report.exportOptions || {
                              format: ReportFormat.PDF,
                              includeCharts: true,
                              includeRawData: true
                            };
                            handleExport(exportOptions);
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={report.name}
                        secondary={`${new Date(report.createdAt).toLocaleString()} · ${report.type}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  저장된 보고서가 없습니다. 보고서를 생성할 때 'IndexedDB에 저장' 옵션을 선택하면 이곳에 표시됩니다.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit" disabled={isLoading || previewLoading}>
            취소
          </Button>
          {(isLoading || previewLoading) && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </DialogActions>
      </Dialog>

      {/* 템플릿 생성 다이얼로그 */}
      <Dialog
        open={createTemplateOpen}
        onClose={handleCloseCreateTemplate}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Typography variant="h6">새 보고서 템플릿 생성</Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 기본 정보 */}
            <TextField
              label="템플릿 이름"
              name="name"
              value={newTemplate.name || ''}
              onChange={handleNewTemplateChange}
              fullWidth
              required
            />
            
            <TextField
              label="설명"
              name="description"
              value={newTemplate.description || ''}
              onChange={handleNewTemplateChange}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>보고서 유형</InputLabel>
              <Select
                name="type"
                value={newTemplate.type || ReportType.VEHICLE_HISTORY}
                onChange={handleNewTemplateChange as any}
                label="보고서 유형"
              >
                {Object.values(ReportType).map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* 데이터 필드 선택 */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              포함할 필드 선택
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {data.length > 0 && Object.keys(data[0]).map(field => (
                <Chip
                  key={field}
                  label={field}
                  clickable
                  color={(newTemplate.fields || []).includes(field) ? 'primary' : 'default'}
                  onClick={() => handleFieldToggle(field)}
                />
              ))}
            </Box>
            
            {/* 레이아웃 옵션 */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              레이아웃 옵션
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>용지 크기</InputLabel>
                <Select
                  name="paperSize"
                  value={newTemplate.paperSize || 'a4'}
                  onChange={handleNewTemplateChange as any}
                  label="용지 크기"
                >
                  <MenuItem value="a4">A4</MenuItem>
                  <MenuItem value="letter">Letter</MenuItem>
                  <MenuItem value="legal">Legal</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>방향</InputLabel>
                <Select
                  name="orientation"
                  value={newTemplate.orientation || 'portrait'}
                  onChange={handleNewTemplateChange as any}
                  label="방향"
                >
                  <MenuItem value="portrait">세로</MenuItem>
                  <MenuItem value="landscape">가로</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            {/* 포함 항목 */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newTemplate.includeCharts || false}
                    onChange={(e) => setNewTemplate({...newTemplate, includeCharts: e.target.checked})}
                  />
                }
                label="차트 포함"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newTemplate.includeHeader || false}
                    onChange={(e) => setNewTemplate({...newTemplate, includeHeader: e.target.checked})}
                  />
                }
                label="헤더 포함"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newTemplate.includeFooter || false}
                    onChange={(e) => setNewTemplate({...newTemplate, includeFooter: e.target.checked})}
                  />
                }
                label="푸터 포함"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newTemplate.includeImages || false}
                    onChange={(e) => setNewTemplate({...newTemplate, includeImages: e.target.checked})}
                  />
                }
                label="이미지 포함"
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseCreateTemplate} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleSaveTemplate}
            color="primary"
            startIcon={<SaveIcon />}
            variant="contained"
          >
            템플릿 저장
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 정기 보고서 설정 다이얼로그 */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={handleCloseScheduleDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">정기 보고서 설정</Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>실행 주기</InputLabel>
              <Select
                name="frequency"
                value={scheduleOptions.frequency}
                onChange={handleScheduleOptionsChange as any}
                label="실행 주기"
              >
                <MenuItem value="daily">매일</MenuItem>
                <MenuItem value="weekly">매주</MenuItem>
                <MenuItem value="monthly">매월</MenuItem>
              </Select>
            </FormControl>
            
            {scheduleOptions.frequency === 'weekly' && (
              <FormControl fullWidth>
                <InputLabel>요일</InputLabel>
                <Select
                  name="dayOfWeek"
                  value={scheduleOptions.dayOfWeek}
                  onChange={handleScheduleOptionsChange as any}
                  label="요일"
                >
                  <MenuItem value={1}>월요일</MenuItem>
                  <MenuItem value={2}>화요일</MenuItem>
                  <MenuItem value={3}>수요일</MenuItem>
                  <MenuItem value={4}>목요일</MenuItem>
                  <MenuItem value={5}>금요일</MenuItem>
                  <MenuItem value={6}>토요일</MenuItem>
                  <MenuItem value={0}>일요일</MenuItem>
                </Select>
              </FormControl>
            )}
            
            <FormControl fullWidth>
              <InputLabel>실행 시간</InputLabel>
              <Select
                name="hour"
                value={scheduleOptions.hour}
                onChange={handleScheduleOptionsChange as any}
                label="실행 시간"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <MenuItem key={i} value={i}>
                    {`${i}시`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={scheduleOptions.emailNotification}
                  onChange={handleScheduleOptionsChange}
                  name="emailNotification"
                />
              }
              label="이메일로 보고서 받기"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={scheduleOptions.saveToIndexedDB}
                  onChange={handleScheduleOptionsChange}
                  name="saveToIndexedDB"
                />
              }
              label="오프라인 저장소에 보고서 저장"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseScheduleDialog} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleSaveSchedule}
            color="primary"
            startIcon={<SaveIcon />}
            variant="contained"
          >
            일정 저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 미리보기 다이얼로그 */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">보고서 미리보기</Typography>
        </DialogTitle>

        <DialogContent>
          {previewLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <CircularProgress />
            </Box>
          )}

          {previewUrl && !previewLoading && (
            <Box sx={{ height: '70vh', width: '100%', overflow: 'auto' }}>
              <iframe 
                src={previewUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="보고서 미리보기"
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClosePreview} color="inherit">
            닫기
          </Button>
          <Button 
            onClick={() => {
              handleClosePreview();
              // 미리보기 설정과 동일한 옵션으로 내보내기 실행
              if (selectedTemplate) {
                const template = allTemplates.find(t => t.id === selectedTemplate);
                if (template) {
                  handleExport({
                    format: ReportFormat.PDF,
                    paperSize: template.paperSize || 'a4',
                    landscape: template.orientation === 'landscape',
                    includeCharts: template.includeCharts || true,
                    includeRawData: true
                  });
                }
              }
            }} 
            color="primary"
            startIcon={<DownloadIcon />}
          >
            PDF로 내보내기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportGenerator;
