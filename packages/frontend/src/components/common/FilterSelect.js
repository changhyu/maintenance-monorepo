import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Select, Tag } from 'antd';
/**
 * 다중 선택 필터 컴포넌트
 * 사용자 정의 태그 렌더링 지원
 */
const FilterSelect = ({ options, value, onChange, label, ...restProps }) => {
    // 태그 렌더링 함수
    const tagRender = (props) => {
        const { label, value, closable, onClose } = props;
        const option = options.find(opt => opt.value === value);
        const color = option?.color || 'blue';
        return (_jsx(Tag, { color: color, closable: closable, onClose: onClose, style: { marginRight: 3 }, children: label }));
    };
    return (_jsxs("div", { children: [label && _jsx("div", { className: "filter-label", children: label }), _jsx(Select, { mode: "multiple", allowClear: true, showArrow: true, value: value, onChange: values => onChange(values), options: options, tagRender: tagRender, ...restProps })] }));
};
export default FilterSelect;
