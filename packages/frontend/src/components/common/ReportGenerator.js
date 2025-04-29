import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, MenuItem, Select, FormControl, InputLabel, Box, CircularProgress, IconButton, Tooltip, TextField, Chip, Switch, FormControlLabel, Tab, Tabs, ListItemText, List, ListItem } from '@mui/material';
import { FileDownload as DownloadIcon, Preview as PreviewIcon, Add as AddIcon, Save as SaveIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { ExportOptionsForm } from '../reports';
import { ReportType, ReportFormat } from '../../services/reportService';
import { exportService } from '../../services/exportService';
import * as indexedDBUtils from '../../utils/indexedDBUtils';
// 기본 템플릿 목록 - ReportType 열거형에 맞게 업데이트
const DEFAULT_TEMPLATES = [
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
/**
 * 고급 보고서 생성 컴포넌트
 * 다양한 형식과 템플릿을 지원하는 보고서 생성 인터페이스 제공
 */
const ReportGenerator = ({ data, availableTypes = Object.values(ReportType), customTemplates = [], filenamePrefix = 'report', onReportGenerated, buttonText = '보고서 생성', disabled = false, companyLogo, buttonStyle }) => {
    // 상태 관리
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    // 새 템플릿 상태
    const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
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
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [scheduleOptions, setScheduleOptions] = useState({
        templateId: '',
        frequency: 'weekly',
        dayOfWeek: 1, // 월요일
        hour: 9,
        emailNotification: true,
        saveToIndexedDB: true
    });
    // 보고서 템플릿 검색 상태
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');
    // 최근 생성된 보고서 상태
    const [recentReports, setRecentReports] = useState([]);
    // 오프라인 저장된 보고서 로딩
    useEffect(() => {
        const loadSavedReports = async () => {
            try {
                const reports = await exportService.getReportsFromIndexedDB();
                setRecentReports(reports.slice(0, 5)); // 최근 5개만 표시
            }
            catch (error) {
                console.error('저장된 보고서 로드 실패:', error);
            }
        };
        loadSavedReports();
    }, []);
    // 필터링된 템플릿 목록
    const filteredTemplates = React.useMemo(() => {
        return [...DEFAULT_TEMPLATES, ...customTemplates]
            .filter(template => availableTypes.includes(template.type) &&
            (templateSearchTerm === '' ||
                template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                template.description.toLowerCase().includes(templateSearchTerm.toLowerCase())));
    }, [availableTypes, customTemplates, templateSearchTerm]);
    // 탭 변경 핸들러
    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
    };
    // 모든 템플릿 (기본 + 사용자 정의)
    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates].filter(template => availableTypes.includes(template.type));
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
    const handleTemplateChange = (event) => {
        setSelectedTemplate(event.target.value);
    };
    // 템플릿에 따른 데이터 처리
    const processDataForTemplate = (rawData, template) => {
        // 템플릿 필드에 따라 데이터 필터링
        const processedData = rawData.map(item => {
            const filteredItem = {};
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
                const fieldName = template.groupBy[0];
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
                const valueA = a[template.sortBy];
                const valueB = b[template.sortBy];
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
    const handleOpenPreview = async (exportOptions) => {
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
            const previewOptions = {
                ...exportOptions,
                format: ReportFormat.PDF,
                includeCharts: template.includeCharts || exportOptions.includeCharts,
                paperSize: template.paperSize || exportOptions.paperSize,
                landscape: template.orientation === 'landscape' || exportOptions.landscape,
                preview: true
            };
            // exportService를 사용하여 미리보기 생성
            const previewBlob = await exportService.previewTemplateReport(data, template, previewOptions);
            // Blob을 URL로 변환
            const previewBlobUrl = URL.createObjectURL(previewBlob);
            setPreviewUrl(previewBlobUrl);
            setPreviewDialogOpen(true);
        }
        catch (error) {
            console.error('보고서 미리보기 생성 중 오류 발생:', error);
            setError('보고서 미리보기를 생성할 수 없습니다.');
        }
        finally {
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
    const handleExport = async (exportOptions) => {
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
                }
                catch (dbError) {
                    console.error('보고서 로컬 저장 중 오류 발생:', dbError);
                    // 로컬 저장 실패는 전체 내보내기를 중단하지 않음
                }
            }
            // 템플릿 기반으로 보고서 내보내기
            await exportService.exportTemplateReport(data, template, exportOptions);
            // 성공 메시지 및 콜백 처리
            console.log(`${template.name} 보고서가 성공적으로 생성되었습니다.`);
            // 콜백 함수 호출
            if (onReportGenerated) {
                onReportGenerated(filename, exportOptions.format);
            }
            // 다이얼로그 닫기
            handleCloseDialog();
        }
        catch (error) {
            console.error('보고서 생성 중 오류 발생:', error);
            setError('보고서 생성 중 오류가 발생했습니다.');
        }
        finally {
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
    const handleNewTemplateChange = (e) => {
        const { name, value } = e.target;
        setNewTemplate(prev => ({
            ...prev,
            [name]: value
        }));
    };
    // 템플릿 필드 토글 핸들러
    const handleFieldToggle = (field) => {
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
            const fullTemplate = {
                id: `custom_${Date.now()}`,
                name: newTemplate.name || '새 템플릿',
                type: newTemplate.type || ReportType.VEHICLE_HISTORY,
                description: newTemplate.description || '',
                fields: newTemplate.fields || [],
                groupBy: newTemplate.groupBy,
                sortBy: newTemplate.sortBy,
                orientation: newTemplate.orientation,
                paperSize: newTemplate.paperSize,
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
        }
        catch (error) {
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
        }
        else {
            setError('정기 보고서를 설정하려면 먼저 템플릿을 선택해주세요.');
        }
    };
    // 정기 보고서 다이얼로그 닫기
    const handleCloseScheduleDialog = () => {
        setScheduleDialogOpen(false);
    };
    // 정기 보고서 옵션 변경 핸들러
    const handleScheduleOptionsChange = (e) => {
        const { name, value, checked } = e.target;
        setScheduleOptions(prev => ({
            ...prev,
            [name]: checked !== undefined ? checked : value
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
        }
        catch (error) {
            console.error('정기 보고서 설정 저장 실패:', error);
            setError('정기 보고서 설정을 저장하는 중 오류가 발생했습니다.');
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(DownloadIcon, {}), onClick: handleOpenDialog, disabled: disabled || data.length === 0, style: buttonStyle, children: buttonText }), _jsxs(Dialog, { open: dialogOpen, onClose: handleCloseDialog, fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: _jsx(Typography, { variant: "h6", children: "\uBCF4\uACE0\uC11C \uC0DD\uC131" }) }), _jsxs(DialogContent, { children: [error && (_jsx(Box, { sx: { color: 'error.main', mb: 2 }, children: error })), _jsxs(Tabs, { value: tabValue, onChange: handleTabChange, sx: { mb: 2 }, children: [_jsx(Tab, { label: "\uD15C\uD50C\uB9BF \uC120\uD0DD" }), _jsx(Tab, { label: "\uCD5C\uADFC \uBCF4\uACE0\uC11C" })] }), tabValue === 0 ? (_jsxs(_Fragment, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(TextField, { placeholder: "\uD15C\uD50C\uB9BF \uAC80\uC0C9...", variant: "outlined", size: "small", value: templateSearchTerm, onChange: (e) => setTemplateSearchTerm(e.target.value), sx: { width: '60%' } }), _jsxs(Box, { children: [_jsx(Button, { startIcon: _jsx(AddIcon, {}), onClick: handleOpenCreateTemplate, sx: { mr: 1 }, children: "\uC0C8 \uD15C\uD50C\uB9BF" }), _jsx(Button, { startIcon: _jsx(ScheduleIcon, {}), onClick: handleOpenScheduleDialog, disabled: !selectedTemplate, children: "\uC815\uAE30 \uC124\uC815" })] })] }), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(FormControl, { fullWidth: true, variant: "outlined", children: [_jsx(InputLabel, { id: "template-select-label", children: "\uD15C\uD50C\uB9BF \uC120\uD0DD" }), _jsx(Select, { labelId: "template-select-label", value: selectedTemplate || '', onChange: handleTemplateChange, label: "\uD15C\uD50C\uB9BF \uC120\uD0DD", children: filteredTemplates.map(template => (_jsxs(MenuItem, { value: template.id, children: [template.name, " (", template.description, ")"] }, template.id))) })] }) }), selectedTemplate && (_jsxs(_Fragment, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "subtitle1", children: "\uBCF4\uACE0\uC11C \uB0B4\uBCF4\uB0B4\uAE30 \uC635\uC158" }), _jsx(Tooltip, { title: "\uBBF8\uB9AC\uBCF4\uAE30", children: _jsx(IconButton, { color: "primary", onClick: () => {
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
                                                            }, disabled: previewLoading || isLoading, children: _jsx(PreviewIcon, {}) }) })] }), _jsx(ExportOptionsForm, { onExport: handleExport, isLoading: isLoading })] }))] })) : (
                            // 최근 보고서 탭
                            _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uCD5C\uADFC \uC0DD\uC131\uB41C \uBCF4\uACE0\uC11C" }), recentReports.length > 0 ? (_jsx(List, { children: recentReports.map(report => (_jsx(ListItem, { secondaryAction: _jsx(IconButton, { edge: "end", onClick: () => {
                                                    // 저장된 보고서로 내보내기 옵션 설정
                                                    const exportOptions = report.exportOptions || {
                                                        format: ReportFormat.PDF,
                                                        includeCharts: true,
                                                        includeRawData: true
                                                    };
                                                    handleExport(exportOptions);
                                                }, children: _jsx(DownloadIcon, {}) }), children: _jsx(ListItemText, { primary: report.name, secondary: `${new Date(report.createdAt).toLocaleString()} · ${report.type}` }) }, report.id))) })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\uC800\uC7A5\uB41C \uBCF4\uACE0\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uBCF4\uACE0\uC11C\uB97C \uC0DD\uC131\uD560 \uB54C 'IndexedDB\uC5D0 \uC800\uC7A5' \uC635\uC158\uC744 \uC120\uD0DD\uD558\uBA74 \uC774\uACF3\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4." }))] }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleCloseDialog, color: "inherit", disabled: isLoading || previewLoading, children: "\uCDE8\uC18C" }), (isLoading || previewLoading) && _jsx(CircularProgress, { size: 24, sx: { ml: 2 } })] })] }), _jsxs(Dialog, { open: createTemplateOpen, onClose: handleCloseCreateTemplate, fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: _jsx(Typography, { variant: "h6", children: "\uC0C8 \uBCF4\uACE0\uC11C \uD15C\uD50C\uB9BF \uC0DD\uC131" }) }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(TextField, { label: "\uD15C\uD50C\uB9BF \uC774\uB984", name: "name", value: newTemplate.name || '', onChange: handleNewTemplateChange, fullWidth: true, required: true }), _jsx(TextField, { label: "\uC124\uBA85", name: "description", value: newTemplate.description || '', onChange: handleNewTemplateChange, fullWidth: true }), _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uBCF4\uACE0\uC11C \uC720\uD615" }), _jsx(Select, { name: "type", value: newTemplate.type || ReportType.VEHICLE_HISTORY, onChange: handleNewTemplateChange, label: "\uBCF4\uACE0\uC11C \uC720\uD615", children: Object.values(ReportType).map(type => (_jsx(MenuItem, { value: type, children: type }, type))) })] }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, sx: { mt: 2 }, children: "\uD3EC\uD568\uD560 \uD544\uB4DC \uC120\uD0DD" }), _jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 1 }, children: data.length > 0 && Object.keys(data[0]).map(field => (_jsx(Chip, { label: field, clickable: true, color: (newTemplate.fields || []).includes(field) ? 'primary' : 'default', onClick: () => handleFieldToggle(field) }, field))) }), _jsx(Typography, { variant: "subtitle1", gutterBottom: true, sx: { mt: 2 }, children: "\uB808\uC774\uC544\uC6C3 \uC635\uC158" }), _jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 2 }, children: [_jsxs(FormControl, { sx: { minWidth: 200 }, children: [_jsx(InputLabel, { children: "\uC6A9\uC9C0 \uD06C\uAE30" }), _jsxs(Select, { name: "paperSize", value: newTemplate.paperSize || 'a4', onChange: handleNewTemplateChange, label: "\uC6A9\uC9C0 \uD06C\uAE30", children: [_jsx(MenuItem, { value: "a4", children: "A4" }), _jsx(MenuItem, { value: "letter", children: "Letter" }), _jsx(MenuItem, { value: "legal", children: "Legal" })] })] }), _jsxs(FormControl, { sx: { minWidth: 200 }, children: [_jsx(InputLabel, { children: "\uBC29\uD5A5" }), _jsxs(Select, { name: "orientation", value: newTemplate.orientation || 'portrait', onChange: handleNewTemplateChange, label: "\uBC29\uD5A5", children: [_jsx(MenuItem, { value: "portrait", children: "\uC138\uB85C" }), _jsx(MenuItem, { value: "landscape", children: "\uAC00\uB85C" })] })] })] }), _jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }, children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: newTemplate.includeCharts || false, onChange: (e) => setNewTemplate({ ...newTemplate, includeCharts: e.target.checked }) }), label: "\uCC28\uD2B8 \uD3EC\uD568" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: newTemplate.includeHeader || false, onChange: (e) => setNewTemplate({ ...newTemplate, includeHeader: e.target.checked }) }), label: "\uD5E4\uB354 \uD3EC\uD568" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: newTemplate.includeFooter || false, onChange: (e) => setNewTemplate({ ...newTemplate, includeFooter: e.target.checked }) }), label: "\uD478\uD130 \uD3EC\uD568" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: newTemplate.includeImages || false, onChange: (e) => setNewTemplate({ ...newTemplate, includeImages: e.target.checked }) }), label: "\uC774\uBBF8\uC9C0 \uD3EC\uD568" })] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleCloseCreateTemplate, color: "inherit", children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: handleSaveTemplate, color: "primary", startIcon: _jsx(SaveIcon, {}), variant: "contained", children: "\uD15C\uD50C\uB9BF \uC800\uC7A5" })] })] }), _jsxs(Dialog, { open: scheduleDialogOpen, onClose: handleCloseScheduleDialog, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: _jsx(Typography, { variant: "h6", children: "\uC815\uAE30 \uBCF4\uACE0\uC11C \uC124\uC815" }) }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uC2E4\uD589 \uC8FC\uAE30" }), _jsxs(Select, { name: "frequency", value: scheduleOptions.frequency, onChange: handleScheduleOptionsChange, label: "\uC2E4\uD589 \uC8FC\uAE30", children: [_jsx(MenuItem, { value: "daily", children: "\uB9E4\uC77C" }), _jsx(MenuItem, { value: "weekly", children: "\uB9E4\uC8FC" }), _jsx(MenuItem, { value: "monthly", children: "\uB9E4\uC6D4" })] })] }), scheduleOptions.frequency === 'weekly' && (_jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uC694\uC77C" }), _jsxs(Select, { name: "dayOfWeek", value: scheduleOptions.dayOfWeek, onChange: handleScheduleOptionsChange, label: "\uC694\uC77C", children: [_jsx(MenuItem, { value: 1, children: "\uC6D4\uC694\uC77C" }), _jsx(MenuItem, { value: 2, children: "\uD654\uC694\uC77C" }), _jsx(MenuItem, { value: 3, children: "\uC218\uC694\uC77C" }), _jsx(MenuItem, { value: 4, children: "\uBAA9\uC694\uC77C" }), _jsx(MenuItem, { value: 5, children: "\uAE08\uC694\uC77C" }), _jsx(MenuItem, { value: 6, children: "\uD1A0\uC694\uC77C" }), _jsx(MenuItem, { value: 0, children: "\uC77C\uC694\uC77C" })] })] })), _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uC2E4\uD589 \uC2DC\uAC04" }), _jsx(Select, { name: "hour", value: scheduleOptions.hour, onChange: handleScheduleOptionsChange, label: "\uC2E4\uD589 \uC2DC\uAC04", children: Array.from({ length: 24 }, (_, i) => (_jsx(MenuItem, { value: i, children: `${i}시` }, i))) })] }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: scheduleOptions.emailNotification, onChange: handleScheduleOptionsChange, name: "emailNotification" }), label: "\uC774\uBA54\uC77C\uB85C \uBCF4\uACE0\uC11C \uBC1B\uAE30" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: scheduleOptions.saveToIndexedDB, onChange: handleScheduleOptionsChange, name: "saveToIndexedDB" }), label: "\uC624\uD504\uB77C\uC778 \uC800\uC7A5\uC18C\uC5D0 \uBCF4\uACE0\uC11C \uC800\uC7A5" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleCloseScheduleDialog, color: "inherit", children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: handleSaveSchedule, color: "primary", startIcon: _jsx(SaveIcon, {}), variant: "contained", children: "\uC77C\uC815 \uC800\uC7A5" })] })] }), _jsxs(Dialog, { open: previewDialogOpen, onClose: handleClosePreview, fullWidth: true, maxWidth: "lg", PaperProps: {
                    sx: { minHeight: '80vh' }
                }, children: [_jsx(DialogTitle, { children: _jsx(Typography, { variant: "h6", children: "\uBCF4\uACE0\uC11C \uBBF8\uB9AC\uBCF4\uAE30" }) }), _jsxs(DialogContent, { children: [previewLoading && (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }, children: _jsx(CircularProgress, {}) })), previewUrl && !previewLoading && (_jsx(Box, { sx: { height: '70vh', width: '100%', overflow: 'auto' }, children: _jsx("iframe", { src: previewUrl, style: { width: '100%', height: '100%', border: 'none' }, title: "\uBCF4\uACE0\uC11C \uBBF8\uB9AC\uBCF4\uAE30" }) }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClosePreview, color: "inherit", children: "\uB2EB\uAE30" }), _jsx(Button, { onClick: () => {
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
                                }, color: "primary", startIcon: _jsx(DownloadIcon, {}), children: "PDF\uB85C \uB0B4\uBCF4\uB0B4\uAE30" })] })] })] }));
};
export default ReportGenerator;
