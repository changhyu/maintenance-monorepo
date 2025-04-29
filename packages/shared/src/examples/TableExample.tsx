import React, { useState } from 'react';
import { Table, PaginationState, SortingState } from '../components/common/Table';

// 데이터 타입 정의
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  [key: string]: unknown;
}

// 샘플 데이터
const users: User[] = [
  { id: 1, name: '김철수', email: 'kim@example.com', role: '관리자', active: true, created_at: '2023-04-01' },
  { id: 2, name: '이영희', email: 'lee@example.com', role: '사용자', active: true, created_at: '2023-04-02' },
  { id: 3, name: '박지민', email: 'park@example.com', role: '사용자', active: false, created_at: '2023-04-03' },
  { id: 4, name: '최민준', email: 'choi@example.com', role: '관리자', active: true, created_at: '2023-04-04' },
  { id: 5, name: '정서연', email: 'jung@example.com', role: '사용자', active: true, created_at: '2023-04-05' },
  { id: 6, name: '강민서', email: 'kang@example.com', role: '사용자', active: false, created_at: '2023-04-06' },
  { id: 7, name: '윤지우', email: 'yoon@example.com', role: '사용자', active: true, created_at: '2023-04-07' },
  { id: 8, name: '장하은', email: 'jang@example.com', role: '사용자', active: true, created_at: '2023-04-08' },
  { id: 9, name: '한소희', email: 'han@example.com', role: '사용자', active: false, created_at: '2023-04-09' },
  { id: 10, name: '송민호', email: 'song@example.com', role: '관리자', active: true, created_at: '2023-04-10' },
  { id: 11, name: '오현우', email: 'oh@example.com', role: '사용자', active: true, created_at: '2023-04-11' },
  { id: 12, name: '임서진', email: 'im@example.com', role: '사용자', active: false, created_at: '2023-04-12' },
];

// 열 정의
const columns = [
  {
    id: 'id',
    header: 'ID',
    accessor: 'id',
    sortable: true,
    width: '60px',
  },
  {
    id: 'name',
    header: '이름',
    accessor: 'name',
    sortable: true,
  },
  {
    id: 'email',
    header: '이메일',
    accessor: 'email',
    sortable: true,
  },
  {
    id: 'role',
    header: '역할',
    accessor: 'role',
    sortable: true,
  },
  {
    id: 'active',
    header: '상태',
    accessor: 'active',
    cell: (_value: boolean) => (
      <span className={`px-2 py-1 text-xs rounded-full ${_value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {_value ? '활성' : '비활성'}
      </span>
    ),
    sortable: true,
  },
  {
    id: 'created_at',
    header: '가입일',
    accessor: 'created_at',
    sortable: true,
  },
  {
    id: 'actions',
    header: '작업',
    accessor: (row: User) => row.id,
    cell: (_value: number) => (
      <div className="flex space-x-2">
        <button className="text-blue-600 hover:text-blue-800">
          편집
        </button>
        <button className="text-red-600 hover:text-red-800">
          삭제
        </button>
      </div>
    ),
  },
];

const TableExample: React.FC = () => {
  // 데이터 상태 (기본, 로딩, 빈 데이터)
  const [dataState, setDataState] = useState<'normal' | 'loading' | 'empty'>('normal');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 정렬 상태
  const [sorting, setSorting] = useState<SortingState>({
    id: 'id',
    direction: 'asc'
  });
  
  // 페이지네이션 상태
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5
  });
  
  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      pageIndex: newPage
    }));
  };
  
  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (newSize: number) => {
    setPagination({
      pageIndex: 0,
      pageSize: newSize
    });
  };
  
  // 행 클릭 핸들러
  const handleRowClick = (user: User) => {
    console.log('User clicked:', user);
  };
  
  // 검색어에 따른 필터링된 데이터
  const filteredData = searchTerm
    ? users.filter(user => 
        user.name.includes(searchTerm) || 
        user.email.includes(searchTerm) || 
        user.role.includes(searchTerm)
      )
    : users;
  
  // 데이터 상태에 따른 표시 데이터
  const displayData = dataState === 'normal' 
    ? filteredData 
    : dataState === 'loading' 
      ? [] 
      : [];
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">사용자 목록</h1>
      
      <div className="mb-4 flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="이름, 이메일, 역할로 검색"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${dataState === 'normal' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setDataState('normal')}
          >
            기본 데이터
          </button>
          <button
            className={`px-4 py-2 rounded-md ${dataState === 'loading' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setDataState('loading')}
          >
            로딩 상태
          </button>
          <button
            className={`px-4 py-2 rounded-md ${dataState === 'empty' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setDataState('empty')}
          >
            빈 데이터
          </button>
        </div>
      </div>
      
      <Table<User>
        data={displayData}
        columns={columns}
        striped
        hoverable
        bordered
        sortable
        initialSorting={sorting}
        onSortingChange={setSorting}
        pagination
        paginationState={pagination}
        totalCount={displayData.length}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onRowClick={handleRowClick}
        isLoading={dataState === 'loading'}
      />
    </div>
  );
};

export default TableExample;