import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from 'react';
import { FolderOutlined, StarOutlined, StarFilled, PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { Typography, Button, Row, Col, Card, Tabs, Tag, Input, Select, Empty, Tooltip, Divider } from 'antd';
import TemplateManageDrawer from './todo/TemplateManageDrawer';
import TemplateSelectionDrawer from './todo/TemplateSelectionDrawer';
import logger from '../utils/logger';
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
/**
 * 컨텍스트 TodoTemplate을 템플릿 상태용 TodoTemplate으로 변환하는 함수
 */
const adaptToTemplateState = (template) => {
    return {
        ...template,
        description: template.description || '', // description이 없으면 빈 문자열로 설정
        items: template.items.map(item => ({
            ...item,
            priority: item.priority || 'medium' // priority가 없으면 medium으로 설정
        }))
    };
};
/**
 * 템플릿 상태용 TodoTemplate을 컨텍스트 TodoTemplate으로 변환하는 함수
 */
const adaptFromTemplateState = (template) => {
    return template;
};
/**
 * Todo 템플릿 관리 컴포넌트
 */
const TodoTemplates = ({ className = '', onTemplateSelect, initialTemplates = [] }) => {
    // 상태 관리
    const [templates, setTemplates] = useState(initialTemplates);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [favoriteTemplates, setFavoriteTemplates] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [sortOrder, setSortOrder] = useState('asc');
    // 드로어 상태
    const [manageDrawerVisible, setManageDrawerVisible] = useState(false);
    const [selectionDrawerVisible, setSelectionDrawerVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    // 샘플 템플릿 생성
    useEffect(() => {
        if (templates.length === 0) {
            const sampleTemplates = [
                {
                    id: 'template-1',
                    name: '정기 엔진 오일 교체',
                    description: '엔진 오일 및 필터 교체를 위한 표준 절차',
                    category: '정기 정비',
                    items: [
                        { title: '엔진 오일 교체', priority: 'medium' },
                        { title: '오일 필터 교체', priority: 'medium' },
                        { title: '엔진 오일 레벨 확인', priority: 'high' }
                    ]
                },
                {
                    id: 'template-2',
                    name: '타이어 로테이션',
                    description: '타이어 교체 및 위치 조정 작업',
                    category: '정기 정비',
                    items: [
                        { title: '타이어 공기압 점검', priority: 'medium' },
                        { title: '타이어 위치 교환', priority: 'medium' },
                        { title: '휠 밸런스 조정', priority: 'low' }
                    ]
                },
                {
                    id: 'template-3',
                    name: '브레이크 점검',
                    description: '브레이크 시스템 종합 점검',
                    category: '안전 점검',
                    items: [
                        { title: '브레이크 패드 점검', priority: 'high' },
                        { title: '브레이크 오일 점검', priority: 'high' },
                        { title: '브레이크 디스크 점검', priority: 'medium' }
                    ]
                }
            ];
            setTemplates(sampleTemplates);
        }
    }, [templates.length]);
    // 즐겨찾기 템플릿 로드
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('favorite-templates');
            if (savedFavorites) {
                setFavoriteTemplates(JSON.parse(savedFavorites));
            }
        }
        catch (error) {
            logger.error('즐겨찾기 템플릿 로드 오류:', error);
        }
    }, []);
    // 템플릿 즐겨찾기 토글
    const toggleFavorite = useCallback((templateId, e) => {
        if (e) {
            e.stopPropagation();
        }
        setFavoriteTemplates(prev => {
            const isCurrentlyFavorite = prev.includes(templateId);
            const newFavorites = isCurrentlyFavorite
                ? prev.filter(id => id !== templateId)
                : [...prev, templateId];
            // 로컬 스토리지에 저장
            try {
                localStorage.setItem('favorite-templates', JSON.stringify(newFavorites));
            }
            catch (error) {
                logger.error('즐겨찾기 저장 오류:', error);
            }
            return newFavorites;
        });
    }, []);
    // 템플릿 선택 처리
    const handleSelectTemplate = useCallback((template) => {
        setSelectedTemplate(template);
        if (onTemplateSelect) {
            onTemplateSelect(template);
        }
        setSelectionDrawerVisible(false);
    }, [onTemplateSelect]);
    // 모든 카테고리 배열
    const categories = useMemo(() => {
        const categorySet = new Set(templates.map(template => template.category));
        return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
    }, [templates]);
    // 필터링된 템플릿 목록
    const filteredTemplates = useMemo(() => {
        let filtered = [...templates];
        // 탭 필터링
        if (activeTab === 'favorites') {
            filtered = filtered.filter(template => favoriteTemplates.includes(template.id));
        }
        // 검색어 필터링
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(template => template.name.toLowerCase().includes(searchLower) ||
                template.description?.toLowerCase().includes(searchLower) ||
                template.category.toLowerCase().includes(searchLower));
        }
        // 카테고리 필터링
        if (categoryFilter) {
            filtered = filtered.filter(template => template.category === categoryFilter);
        }
        // 정렬
        filtered.sort((a, b) => {
            // 먼저 즐겨찾기 항목을 위로
            const aFavorite = favoriteTemplates.includes(a.id);
            const bFavorite = favoriteTemplates.includes(b.id);
            if (aFavorite && !bFavorite)
                return -1;
            if (!aFavorite && bFavorite)
                return 1;
            // 이름 기준 정렬
            const comparison = a.name.localeCompare(b.name);
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        return filtered;
    }, [templates, search, categoryFilter, activeTab, favoriteTemplates, sortOrder]);
    // 타입 변환된 템플릿 상태
    const adaptedTemplates = useMemo(() => templates.map(adaptToTemplateState), [templates]);
    // 타입 변환된 필터링된 템플릿 상태
    const adaptedFilteredTemplates = useMemo(() => filteredTemplates.map(adaptToTemplateState), [filteredTemplates]);
    return (_jsxs("div", { className: `todo-templates ${className}`, children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx(Title, { level: 4, children: "\uC815\uBE44 \uC791\uC5C5 \uD15C\uD50C\uB9BF" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setManageDrawerVisible(true), children: "\uD15C\uD50C\uB9BF \uAD00\uB9AC" }), _jsx(Button, { onClick: () => setSelectionDrawerVisible(true), children: "\uD15C\uD50C\uB9BF \uC801\uC6A9" })] })] }), _jsxs("div", { className: "mb-4 flex flex-col md:flex-row gap-4", children: [_jsx(Input.Search, { placeholder: "\uD15C\uD50C\uB9BF \uAC80\uC0C9...", value: search, onChange: e => setSearch(e.target.value), style: { maxWidth: 300 }, allowClear: true }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx(Select, { placeholder: "\uCE74\uD14C\uACE0\uB9AC \uD544\uD130", style: { width: 180 }, value: categoryFilter || undefined, onChange: setCategoryFilter, allowClear: true, children: categories.map(category => (_jsx(Option, { value: category, children: category }, category))) }), _jsx(Button, { icon: sortOrder === 'asc' ? _jsx(SortAscendingOutlined, {}) : _jsx(SortDescendingOutlined, {}), onClick: () => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc')), size: "middle" })] })] }), _jsxs(Tabs, { activeKey: activeTab, onChange: setActiveTab, className: "mb-4", children: [_jsx(TabPane, { tab: "\uBAA8\uB4E0 \uD15C\uD50C\uB9BF" }, "all"), _jsx(TabPane, { tab: _jsxs("span", { children: ["\uC990\uACA8\uCC3E\uAE30", _jsx(Tag, { color: "blue", className: "ml-1", children: favoriteTemplates.length })] }) }, "favorites")] }), filteredTemplates.length === 0 ? (_jsx(Empty, { description: "\uD45C\uC2DC\uD560 \uD15C\uD50C\uB9BF\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" })) : (_jsx(Row, { gutter: [16, 16], children: filteredTemplates.map(template => (_jsx(Col, { xs: 24, sm: 12, md: 8, lg: 6, children: _jsxs(Card, { hoverable: true, onClick: () => handleSelectTemplate(template), className: "h-full", title: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx(Tooltip, { title: template.name, children: _jsx("span", { className: "truncate", children: template.name }) }), _jsx(Tooltip, { title: favoriteTemplates.includes(template.id) ? '즐겨찾기 제거' : '즐겨찾기 추가', children: _jsx(Button, { type: "text", size: "small", icon: favoriteTemplates.includes(template.id) ? (_jsx(StarFilled, { style: { color: '#faad14' } })) : (_jsx(StarOutlined, {})), onClick: e => toggleFavorite(template.id, e) }) })] }), extra: _jsx(Tag, { color: "blue", children: template.items.length }), children: [_jsx("div", { className: "mb-2", children: _jsx(Text, { type: "secondary", ellipsis: { tooltip: template.description }, children: template.description ?? '설명 없음' }) }), _jsx(Divider, { className: "my-2" }), _jsx("div", { className: "flex justify-between", children: _jsx(Tag, { icon: _jsx(FolderOutlined, {}), color: "cyan", children: template.category }) })] }) }, template.id))) })), _jsx(TemplateManageDrawer, { visible: manageDrawerVisible, templateState: {
                    templates: adaptedTemplates,
                    selectedTemplate: null,
                    editingTemplate: null,
                    templateForm: {
                        name: '',
                        description: '',
                        category: '일반',
                        items: []
                    },
                    templateVisible: false,
                    templateManageVisible: true
                }, onClose: () => setManageDrawerVisible(false), onCancelEdit: () => { }, onSaveEdit: () => { }, onItemChange: () => { }, onRemoveItem: () => { }, onAddItem: () => { }, onAddTemplate: () => { }, onTemplateSelect: () => { }, onEditTemplate: () => { }, onDeleteTemplate: () => { }, templateSearch: "", setTemplateSearch: () => { }, categories: categories, filteredTemplates: adaptedFilteredTemplates }), _jsx(TemplateSelectionDrawer, { visible: selectionDrawerVisible, templates: adaptedTemplates, selectedTemplate: selectedTemplate ? adaptToTemplateState(selectedTemplate) : null, onClose: () => setSelectionDrawerVisible(false), onSelect: (template) => handleSelectTemplate(adaptFromTemplateState(template)), onConfirm: async () => { }, loading: false, templateSearch: search, setTemplateSearch: setSearch, templateCategoryFilter: categoryFilter, setTemplateCategoryFilter: setCategoryFilter, categories: categories, filteredTemplates: adaptedFilteredTemplates })] }));
};
export default TodoTemplates;
