import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { SearchOutlined, FileTextOutlined, TagOutlined, FilterOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { Drawer, List, Button, Input, Space, Tag, Empty, Select, Card, Tooltip, Badge, Typography } from 'antd';
const { Title, Text } = Typography;
const { Option } = Select;
/**
 * 템플릿 선택 Drawer 컴포넌트
 */
const TemplateSelectionDrawer = ({ visible, templates, selectedTemplate, onClose, onSelect, onConfirm, loading, templateSearch, setTemplateSearch, templateCategoryFilter, setTemplateCategoryFilter, categories, filteredTemplates }) => {
    const [favoriteTemplates, setFavoriteTemplates] = useState([]);
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    // 로컬 스토리지에서 즐겨찾기 템플릿 로드
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('favorite-templates');
            if (savedFavorites) {
                setFavoriteTemplates(JSON.parse(savedFavorites));
            }
        }
        catch (error) {
            console.error('즐겨찾기 템플릿 로드 오류:', error);
        }
    }, []);
    // 즐겨찾기 토글
    const toggleFavorite = (template, e) => {
        e.stopPropagation();
        const templateId = template.id;
        let newFavorites;
        if (favoriteTemplates.includes(templateId)) {
            newFavorites = favoriteTemplates.filter(id => id !== templateId);
        }
        else {
            newFavorites = [...favoriteTemplates, templateId];
        }
        setFavoriteTemplates(newFavorites);
        localStorage.setItem('favorite-templates', JSON.stringify(newFavorites));
    };
    // 템플릿 미리보기 표시
    const showTemplatePreview = (template, e) => {
        e.stopPropagation();
        setPreviewTemplate(template);
        setShowPreview(true);
    };
    // 정렬된 템플릿 목록 (즐겨찾기 우선)
    const sortedTemplates = [...filteredTemplates].sort((a, b) => {
        const aFavorite = favoriteTemplates.includes(a.id);
        const bFavorite = favoriteTemplates.includes(b.id);
        if (aFavorite && !bFavorite)
            return -1;
        if (!aFavorite && bFavorite)
            return 1;
        return a.name.localeCompare(b.name);
    });
    return (_jsxs(_Fragment, { children: [_jsxs(Drawer, { title: "\uD15C\uD50C\uB9BF\uC5D0\uC11C \uC791\uC5C5 \uCD94\uAC00", placement: "right", width: 400, onClose: onClose, open: visible, footer: _jsxs("div", { style: { textAlign: 'right' }, children: [_jsx(Button, { onClick: onClose, style: { marginRight: 8 }, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "primary", onClick: onConfirm, loading: loading, disabled: !selectedTemplate, children: "\uD15C\uD50C\uB9BF \uC801\uC6A9" })] }), children: [_jsxs(Space, { direction: "vertical", style: { width: '100%', marginBottom: 16 }, children: [_jsx(Input, { placeholder: "\uD15C\uD50C\uB9BF \uAC80\uC0C9...", prefix: _jsx(SearchOutlined, {}), value: templateSearch, onChange: e => setTemplateSearch(e.target.value), allowClear: true }), _jsxs(Space, { children: [_jsx(Select, { placeholder: "\uCE74\uD14C\uACE0\uB9AC \uD544\uD130", style: { width: 200 }, value: templateCategoryFilter || undefined, onChange: setTemplateCategoryFilter, allowClear: true, showSearch: true, filterOption: (input, option) => (option?.children)
                                            .toLowerCase()
                                            .indexOf(input.toLowerCase()) >= 0, suffixIcon: _jsx(FilterOutlined, {}), children: categories.map(category => (_jsx(Option, { value: category, children: category }, category))) }), _jsx(Badge, { count: favoriteTemplates.length, size: "small", offset: [-5, 0], children: _jsx(Button, { type: favoriteTemplates.length > 0 ? 'primary' : 'default', icon: _jsx(StarFilled, {}), onClick: () => setTemplateSearch('__favorite__'), title: "\uC990\uACA8\uCC3E\uAE30 \uD15C\uD50C\uB9BF \uBCF4\uAE30", children: "\uC990\uACA8\uCC3E\uAE30" }) })] })] }), filteredTemplates.length === 0 ? (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" })) : (_jsx(List, { dataSource: sortedTemplates, renderItem: template => (_jsx(List.Item, { style: {
                                cursor: 'pointer',
                                background: selectedTemplate?.id === template.id ? '#f0f7ff' : 'transparent',
                                borderRadius: 6,
                                marginBottom: 8,
                                border: selectedTemplate?.id === template.id ? '1px solid #1890ff' : '1px solid #f0f0f0'
                            }, onClick: () => onSelect(template), actions: [
                                _jsx(Tooltip, { title: "\uC990\uACA8\uCC3E\uAE30", children: _jsx(Button, { type: "text", size: "small", icon: favoriteTemplates.includes(template.id) ? (_jsx(StarFilled, { style: { color: '#faad14' } })) : (_jsx(StarOutlined, {})), onClick: e => toggleFavorite(template, e) }) }, "favorite"),
                                _jsx(Tooltip, { title: "\uBBF8\uB9AC\uBCF4\uAE30", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(FileTextOutlined, {}), onClick: e => showTemplatePreview(template, e) }) }, "preview")
                            ], children: _jsx(List.Item.Meta, { title: _jsxs(Space, { children: [_jsx(Text, { strong: true, children: template.name }), favoriteTemplates.includes(template.id) && (_jsx(StarFilled, { style: { color: '#faad14', fontSize: '14px' } }))] }), description: _jsxs(Space, { direction: "vertical", size: 2, style: { width: '100%' }, children: [_jsx(Text, { type: "secondary", ellipsis: { tooltip: template.description }, children: template.description || '설명 없음' }), _jsxs(Space, { children: [_jsx(Tag, { icon: _jsx(TagOutlined, {}), color: "blue", children: template.category }), _jsxs(Tag, { color: "green", children: [template.items.length, "\uAC1C \uC791\uC5C5"] })] })] }) }) }, template.id)) }))] }), _jsx(Drawer, { title: `템플릿 미리보기: ${previewTemplate?.name || ''}`, placement: "right", width: 500, onClose: () => setShowPreview(false), open: showPreview && previewTemplate !== null, children: previewTemplate && (_jsxs("div", { children: [_jsxs(Space, { direction: "vertical", style: { width: '100%', marginBottom: 16 }, children: [_jsxs(Card, { title: "\uD15C\uD50C\uB9BF \uC815\uBCF4", bordered: false, children: [_jsxs("p", { children: [_jsx("strong", { children: "\uC774\uB984:" }), " ", previewTemplate.name] }), _jsxs("p", { children: [_jsx("strong", { children: "\uCE74\uD14C\uACE0\uB9AC:" }), " ", previewTemplate.category] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC124\uBA85:" }), " ", previewTemplate.description || '설명 없음'] })] }), _jsxs(Title, { level: 5, style: { marginTop: 16 }, children: ["\uD3EC\uD568\uB41C \uC791\uC5C5 (", previewTemplate.items.length, "\uAC1C)"] }), _jsx(List, { dataSource: previewTemplate.items, renderItem: (item, index) => (_jsx(List.Item, { children: _jsxs(Card, { size: "small", title: `${index + 1}. ${item.title}`, style: { width: '100%' }, extra: item.priority && (_jsx(Tag, { color: item.priority === 'high'
                                                    ? 'red'
                                                    : item.priority === 'medium'
                                                        ? 'orange'
                                                        : 'green', children: item.priority === 'high'
                                                    ? '높음'
                                                    : item.priority === 'medium'
                                                        ? '중간'
                                                        : '낮음' })), children: [item.description && _jsx("p", { children: item.description }), _jsxs(Space, { children: [item.dueDate && _jsxs(Tag, { color: "blue", children: ["\uB9C8\uAC10\uC77C: ", item.dueDate] }), item.assignedTo && _jsxs(Tag, { color: "purple", children: ["\uB2F4\uB2F9\uC790: ", item.assignedTo] })] })] }) })) })] }), _jsx("div", { style: { marginTop: 16, textAlign: 'right' }, children: _jsx(Button, { type: "primary", onClick: () => {
                                    onSelect(previewTemplate);
                                    setShowPreview(false);
                                }, children: "\uC774 \uD15C\uD50C\uB9BF \uC120\uD0DD" }) })] })) })] }));
};
export default TemplateSelectionDrawer;
