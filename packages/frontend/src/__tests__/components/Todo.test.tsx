import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodoContext } from '../../context/TodoContext';
import Todo from '../../components/Todo';
import { act } from 'react-dom/test-utils';

// 목업 데이터
const mockTodos = [
  {
    id: '1',
    title: '차량 정비',
    description: '정기 점검',
    status: 'pending',
    priority: 'high',
    dueDate: new Date().toISOString(),
    vehicleId: 'v1'
  }
];

// 목업 컨텍스트
const mockTodoContext = {
  todos: mockTodos,
  refreshTodos: jest.fn(),
  loading: false,
  error: null
};

describe('Todo Component', () => {
  beforeEach(() => {
    // localStorage 목업
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage
    });
  });

  it('renders todo list correctly', () => {
    render(
      <TodoContext.Provider value={mockTodoContext}>
        <Todo />
      </TodoContext.Provider>
    );

    expect(screen.getByText('차량 정비')).toBeInTheDocument();
    expect(screen.getByText('정기 점검')).toBeInTheDocument();
  });

  it('handles offline mode correctly', async () => {
    // 오프라인 모드 시뮬레이션
    const originalOnline = window.navigator.onLine;
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true
    });

    render(
      <TodoContext.Provider value={mockTodoContext}>
        <Todo />
      </TodoContext.Provider>
    );

    expect(screen.getByText(/오프라인 모드/i)).toBeInTheDocument();

    // 네트워크 상태 복구
    Object.defineProperty(window.navigator, 'onLine', {
      value: originalOnline
    });
  });

  it('handles todo creation correctly', async () => {
    const mockCreateTodo = jest.fn();
    
    render(
      <TodoContext.Provider value={{ ...mockTodoContext, createTodo: mockCreateTodo }}>
        <Todo />
      </TodoContext.Provider>
    );

    // Todo 생성 버튼 클릭
    fireEvent.click(screen.getByText(/할 일 추가/i));

    // 폼 입력
    fireEvent.change(screen.getByLabelText(/제목/i), {
      target: { value: '새로운 정비' }
    });

    fireEvent.change(screen.getByLabelText(/설명/i), {
      target: { value: '엔진 오일 교체' }
    });

    // 폼 제출
    fireEvent.click(screen.getByText(/저장/i));

    await waitFor(() => {
      expect(mockCreateTodo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '새로운 정비',
          description: '엔진 오일 교체'
        })
      );
    });
  });

  it('handles error states correctly', () => {
    const errorContext = {
      ...mockTodoContext,
      error: new Error('데이터를 불러오는데 실패했습니다.')
    };

    render(
      <TodoContext.Provider value={errorContext}>
        <Todo />
      </TodoContext.Provider>
    );

    expect(screen.getByText(/데이터를 불러오는데 실패했습니다/i)).toBeInTheDocument();
  });
}); 