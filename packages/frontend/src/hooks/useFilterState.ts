import { useCallback, useReducer } from 'react';
import { TodoFilter as FilterType } from '../hooks/useTodoService';

// 필터 리듀서 타입
export type FilterAction = 
  | { type: 'SET_FILTER'; payload: string }
  | { type: 'SET_CURRENT_FILTER'; payload: FilterType }
  | { type: 'RESET_FILTERS' };

// 필터 상태 타입
export interface FilterState {
  currentFilter: FilterType;
  filterView: string;
}

// 필터 리듀서 함수
const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
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
  const handleFilterChange = useCallback((filter: FilterType) => {
    dispatchFilter({ type: 'SET_CURRENT_FILTER', payload: filter });
  }, []);

  return [filterState, dispatchFilter, handleFilterChange] as const;
};

export default useFilterState; 