import { useReducer } from 'react';
// 템플릿 리듀서 함수
const templateReducer = (state, action) => {
    switch (action.type) {
        case 'LOAD_TEMPLATES':
            return {
                ...state,
                templates: action.payload
            };
        case 'ADD_TEMPLATE':
            return {
                ...state,
                templates: [...state.templates, action.payload]
            };
        case 'UPDATE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.map(template => template.id === action.payload.id ? action.payload : template)
            };
        case 'DELETE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.filter(template => template.id !== action.payload)
            };
        case 'SET_SELECTED_TEMPLATE':
            return {
                ...state,
                selectedTemplate: action.payload
            };
        case 'SET_EDITING_TEMPLATE':
            return {
                ...state,
                editingTemplate: action.payload,
                // 편집 시작할 때 폼 데이터 설정
                templateForm: action.payload
                    ? {
                        name: action.payload.name,
                        description: action.payload.description,
                        category: action.payload.category,
                        items: [...action.payload.items]
                    }
                    : state.templateForm
            };
        case 'SET_TEMPLATE_FORM':
            return {
                ...state,
                templateForm: action.payload
            };
        case 'SET_TEMPLATE_VISIBLE':
            return {
                ...state,
                templateVisible: action.payload
            };
        case 'SET_TEMPLATE_MANAGE_VISIBLE':
            return {
                ...state,
                templateManageVisible: action.payload
            };
        case 'RESET_TEMPLATE_FORM':
            return {
                ...state,
                templateForm: {
                    name: '',
                    description: '',
                    category: '일반',
                    items: []
                },
                editingTemplate: null
            };
        default:
            return state;
    }
};
// 초기 상태
const initialState = {
    templates: [],
    selectedTemplate: null,
    editingTemplate: null,
    templateForm: {
        name: '',
        description: '',
        category: '일반',
        items: []
    },
    templateVisible: false,
    templateManageVisible: false
};
// 템플릿 상태 훅
export const useTemplateState = () => {
    const [templateState, templateDispatch] = useReducer(templateReducer, initialState);
    return [templateState, templateDispatch];
};
export default useTemplateState;
