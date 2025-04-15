import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { TodoService, TodoStatus, TodoPriority } from '../../packages/frontend/src/services/todoService';

// axios 모킹
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }))
  }
}));

// apiClient 모킹
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
};

// 로거 모킹
vi.mock('../../packages/frontend/src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('TodoService', () => {
  let todoService;

  beforeEach(() => {
    todoService = new TodoService();
    // mock axios 인스턴스의 응답 초기화
    vi.resetAllMocks();
    // apiClient 주입
    todoService.apiClient = mockApiClient;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getTodos', () => {
    it('should fetch todos successfully', async () => {
      const mockTodos = [
        {
          id: '1',
          title: '테스트 할 일',
          description: '테스트 설명',
          completed: false,
          status: TodoStatus.PENDING,
          priority: TodoPriority.MEDIUM,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockTodos });

      const result = await todoService.getTodos();
      expect(result).toEqual(mockTodos);
      expect(mockApiClient.get).toHaveBeenCalledWith('/todos', { params: {} });
    });

    it('should handle errors when fetching todos', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(todoService.getTodos()).rejects.toThrow('할 일 목록을 불러오는 데 실패했습니다.');
    });
  });

  describe('createTodo', () => {
    it('should create a todo successfully', async () => {
      const todoData = {
        title: '새 할 일',
        description: '설명',
        priority: TodoPriority.HIGH
      };

      const mockResponse = {
        id: '1',
        ...todoData,
        completed: false,
        status: TodoStatus.PENDING,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await todoService.createTodo(todoData);
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith('/todos', todoData);
    });
  });

  describe('updateTodo', () => {
    it('should update a todo successfully', async () => {
      const todoId = '1';
      const updates = {
        title: '수정된 할 일',
        description: '수정된 설명'
      };

      const mockResponse = {
        id: todoId,
        title: updates.title,
        description: updates.description,
        completed: false,
        status: TodoStatus.PENDING,
        priority: TodoPriority.MEDIUM,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      mockApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await todoService.updateTodo(todoId, updates);
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.put).toHaveBeenCalledWith(`/todos/${todoId}`, updates);
    });
  });

  describe('deleteTodo', () => {
    it('should delete a todo successfully', async () => {
      const todoId = '1';
      mockApiClient.delete.mockResolvedValueOnce({});

      const result = await todoService.deleteTodo(todoId);
      expect(result).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/todos/${todoId}`);
    });
  });

  describe('toggleComplete', () => {
    it('should toggle todo to complete status', async () => {
      const todoId = '1';
      const mockResponse = {
        id: todoId,
        title: '할 일',
        completed: true,
        status: TodoStatus.COMPLETED,
        priority: TodoPriority.MEDIUM,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      mockApiClient.patch.mockResolvedValueOnce({ data: mockResponse });

      const result = await todoService.toggleComplete(todoId, true);
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.patch).toHaveBeenCalledWith(`/todos/${todoId}/complete`, {});
    });

    it('should toggle todo to pending status', async () => {
      const todoId = '1';
      const mockResponse = {
        id: todoId,
        title: '할 일',
        completed: false,
        status: TodoStatus.PENDING,
        priority: TodoPriority.MEDIUM,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      };

      mockApiClient.patch.mockResolvedValueOnce({ data: mockResponse });

      const result = await todoService.toggleComplete(todoId, false);
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        `/todos/${todoId}/status`, 
        { status: TodoStatus.PENDING }
      );
    });
  });
}); 