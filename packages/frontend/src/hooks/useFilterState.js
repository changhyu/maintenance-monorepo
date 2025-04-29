import { useCallback, useReducer } from 'react';
// 필터 리듀서 함수
const filterReducer = (state, action) => {
    switch (action.type) {
        case 'SET_FILTER':
            return {
                ...state,
                filterView: action.payload
            };
        case 'SET_CURRENT_FILTER':
            return {
                ...state,
                currentFilter: action.payload
            };
        case 'RESET_FILTERS':
            return {
                currentFilter: {},
                filterView: 'all'
            };
        default:
            return state;
    }
};
export const useFilterState = () => {
    const [filterState, dispatchFilter] = useReducer(filterReducer, {
        currentFilter: {},
        filterView: 'all'
    });
    // TodoFilter 컴포넌트에 전달할 콜백 함수
    const handleFilterChange = useCallback((filter) => {
        dispatchFilter({ type: 'SET_CURRENT_FILTER', payload: filter });
    }, []);
    return [filterState, dispatchFilter, handleFilterChange];
};
export default useFilterState;
