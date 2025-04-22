import { Todo, TodoCreateRequest, TodoUpdateRequest } from '../services/todoService';

/**
 * 오프라인에서 대기 중인 변경사항 타입 정의
 */
export type PendingActionType = 'create' | 'update' | 'delete';

/**
 * 대기 중인 변경사항 인터페이스
 */
export interface PendingChange {
  id: string;
  tempId?: string;
  action: 'create' | 'update' | 'delete';
  data?: TodoCreateRequest | TodoUpdateRequest;
  timestamp: number;
}

/**
 * 오프라인 작업 저장 형식
 */
export interface OfflineOperation {
  id: string;
  type: PendingActionType;
  data: TodoCreateRequest | TodoUpdateRequest | {};
  timestamp: number;
  tempId?: string;
}

/**
 * 동기화 상태 타입
 */
export type SyncStatus = 'idle' | 'syncing' | 'error';

/**
 * 동기화 결과 인터페이스
 */
export interface SyncResult {
  success: number;
  failed: number;
  errors?: Error[];
}

export enum TodoPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  completed: boolean;
  dueDate: string | null;
  vehicleId?: string;
  createdAt: string;
  updatedAt: string;
  _tempId?: string;
}

export interface TodoCreateRequest {
  title: string;
  description?: string;
  priority?: TodoPriority;
  status?: TodoStatus;
  dueDate?: string | null;
  vehicleId?: string;
}

export interface TodoUpdateRequest {
  title?: string;
  description?: string;
  priority?: TodoPriority;
  status?: TodoStatus;
  completed?: boolean;
  dueDate?: string | null;
  vehicleId?: string;
}

export type TodoFilterType = {
  completed: 'all' | 'completed' | 'incomplete';
  priority: 'all' | TodoPriority;
  search: string;
  dueDate: 'all' | 'today' | 'overdue';
}; 