import { Todo, TodoCreateRequest, TodoUpdateRequest } from '../services/todoService';

/**
 * 오프라인에서 대기 중인 변경사항 타입 정의
 */
export type PendingActionType = 'create' | 'update' | 'delete';

/**
 * 대기 중인 변경사항 인터페이스
 */
export interface PendingChange extends Todo {
  _pending: PendingActionType;
  _originalId?: string; // 임시 ID와 원본 ID 매핑을 위한 필드
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
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

/**
 * 동기화 결과 인터페이스
 */
export interface SyncResult {
  success: number;
  failed: number;
  errors?: Error[];
} 