// 테이블 열 정의 타입
export interface TableColumn<T = Record<string, unknown>> {
  id: string;                           // 고유 식별자
  header: React.ReactNode;              // 헤더 텍스트/노드
  accessor: keyof T | ((row: T) => unknown); // 데이터 접근자
  cell?: (value: unknown, row: T) => React.ReactNode; // 사용자 정의 셀 렌더링
  sortable?: boolean;                  // 정렬 가능 여부
  width?: string | number;             // 너비 지정
  align?: 'left' | 'center' | 'right'; // 정렬 방향
}

// 정렬 상태 타입
export interface SortingState {
  id: string;
  direction: 'asc' | 'desc' | null;
}

// 페이지네이션 상태 타입
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

// 테이블 Props 타입
export interface TableProps<T = Record<string, unknown>> {
  data: T[];                           // 테이블 데이터
  columns: TableColumn<T>[];           // 테이블 열 정의
  isLoading?: boolean;                 // 로딩 상태
  onRowClick?: (row: T) => void;       // 행 클릭 핸들러
  className?: string;                  // 추가 클래스
  striped?: boolean;                   // 줄무늬 스타일
  hoverable?: boolean;                 // 호버 효과
  bordered?: boolean;                  // 테두리 표시
  
  // 정렬 관련
  sortable?: boolean;                  // 정렬 가능 여부
  initialSorting?: SortingState;       // 초기 정렬 상태
  onSortingChange?: (sorting: SortingState) => void; // 정렬 변경 핸들러
  
  // 페이지네이션 관련
  pagination?: boolean;                // 페이지네이션 사용 여부
  paginationState?: PaginationState;   // 페이지네이션 상태
  totalCount?: number;                 // 전체 데이터 개수
  onPageChange?: (page: number) => void; // 페이지 변경 핸들러
  onPageSizeChange?: (pageSize: number) => void; // 페이지 크기 변경 핸들러
}