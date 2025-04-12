"""
오프라인 모드 관리 모듈.
"""

import json
import os
from enum import Enum
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Type, TypeVar
import uuid

from ..core.logging import get_logger

logger = get_logger("offline_manager")

T = TypeVar('T')

class PendingOperationType(str, Enum):
    """대기 중인 작업 유형."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    CUSTOM = "custom"


class OfflineStoreManager:
    """오프라인 데이터 저장소 관리자."""
    
    def __init__(self, storage_dir: str):
        """
        초기화.
        
        Args:
            storage_dir: 오프라인 데이터 저장 디렉토리
        """
        self.storage_dir = storage_dir
        self._ensure_storage_dir()
        
    def _ensure_storage_dir(self):
        """저장소 디렉토리가 존재하는지 확인하고 없으면 생성합니다."""
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir, exist_ok=True)
            logger.info(f"오프라인 저장소 디렉토리 생성: {self.storage_dir}")
    
    def _get_entity_file_path(self, entity_type: str) -> str:
        """엔티티 타입에 해당하는 파일 경로를 반환합니다."""
        return os.path.join(self.storage_dir, f"{entity_type}.json")
    
    def _get_pending_ops_file_path(self, entity_type: str) -> str:
        """대기 중인 작업 파일 경로를 반환합니다."""
        return os.path.join(self.storage_dir, f"{entity_type}_pending.json")
    
    def save_entities(self, entity_type: str, entities: List[Dict[str, Any]]):
        """
        엔티티 목록을 오프라인 저장소에 저장합니다.
        
        Args:
            entity_type: 엔티티 타입
            entities: 저장할 엔티티 목록
        """
        file_path = self._get_entity_file_path(entity_type)
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(entities, f, ensure_ascii=False, default=self._json_serializer)
            logger.info(f"{len(entities)}개의 {entity_type} 엔티티 오프라인 저장 완료")
        except Exception as e:
            logger.error(f"{entity_type} 엔티티 오프라인 저장 실패: {str(e)}")
            raise
    
    def load_entities(self, entity_type: str) -> List[Dict[str, Any]]:
        """
        오프라인 저장소에서 엔티티 목록을 로드합니다.
        
        Args:
            entity_type: 엔티티 타입
            
        Returns:
            List[Dict[str, Any]]: 로드된 엔티티 목록
        """
        file_path = self._get_entity_file_path(entity_type)
        
        if not os.path.exists(file_path):
            logger.warning(f"{entity_type} 엔티티 파일이 존재하지 않음: {file_path}")
            return []
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                entities = json.load(f)
            logger.info(f"{len(entities)}개의 {entity_type} 엔티티 오프라인 로드 완료")
            return entities
        except Exception as e:
            logger.error(f"{entity_type} 엔티티 오프라인 로드 실패: {str(e)}")
            return []
    
    def add_pending_operation(
        self, 
        entity_type: str, 
        operation_type: PendingOperationType,
        entity_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        대기 중인 작업을 추가합니다.
        
        Args:
            entity_type: 엔티티 타입
            operation_type: 작업 타입
            entity_id: 엔티티 ID (선택적)
            data: 작업 데이터 (선택적)
            
        Returns:
            str: 작업 ID
        """
        file_path = self._get_pending_ops_file_path(entity_type)
        
        # 기존 작업 로드
        pending_ops = self._load_pending_operations(entity_type)
        
        # 새 작업 생성
        operation_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        new_operation = {
            "id": operation_id,
            "type": operation_type,
            "entity_id": entity_id,
            "timestamp": timestamp,
            "data": data or {},
            "status": "pending"
        }
        
        # 작업 추가
        pending_ops.append(new_operation)
        
        # 저장
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(pending_ops, f, ensure_ascii=False, default=self._json_serializer)
            logger.info(f"대기 중인 {operation_type} 작업 추가 완료: {entity_type}/{entity_id or 'new'}")
            return operation_id
        except Exception as e:
            logger.error(f"대기 중인 작업 추가 실패: {str(e)}")
            raise
    
    def _load_pending_operations(self, entity_type: str) -> List[Dict[str, Any]]:
        """대기 중인 작업 목록을 로드합니다."""
        file_path = self._get_pending_ops_file_path(entity_type)
        
        if not os.path.exists(file_path):
            return []
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"대기 중인 작업 로드 실패: {str(e)}")
            return []
    
    def get_pending_operations(self, entity_type: str) -> List[Dict[str, Any]]:
        """
        대기 중인 작업 목록을 조회합니다.
        
        Args:
            entity_type: 엔티티 타입
            
        Returns:
            List[Dict[str, Any]]: 대기 중인 작업 목록
        """
        return self._load_pending_operations(entity_type)
    
    def mark_operation_complete(self, entity_type: str, operation_id: str, result: Optional[Dict[str, Any]] = None):
        """
        작업을 완료 상태로 표시합니다.
        
        Args:
            entity_type: 엔티티 타입
            operation_id: 작업 ID
            result: 작업 결과 (선택적)
        """
        file_path = self._get_pending_ops_file_path(entity_type)
        
        # 기존 작업 로드
        pending_ops = self._load_pending_operations(entity_type)
        
        # 작업 찾기 및 업데이트
        for op in pending_ops:
            if op["id"] == operation_id:
                op["status"] = "completed"
                op["completed_at"] = datetime.now().isoformat()
                if result:
                    op["result"] = result
                break
        
        # 저장
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(pending_ops, f, ensure_ascii=False, default=self._json_serializer)
            logger.info(f"작업 완료 처리: {entity_type}/{operation_id}")
        except Exception as e:
            logger.error(f"작업 완료 상태 업데이트 실패: {str(e)}")
            raise
    
    def clear_completed_operations(self, entity_type: str):
        """
        완료된 작업을 제거합니다.
        
        Args:
            entity_type: 엔티티 타입
        """
        file_path = self._get_pending_ops_file_path(entity_type)
        
        # 기존 작업 로드
        pending_ops = self._load_pending_operations(entity_type)
        
        # 완료된 작업 필터링
        active_ops = [op for op in pending_ops if op["status"] != "completed"]
        
        # 저장
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(active_ops, f, ensure_ascii=False, default=self._json_serializer)
            logger.info(f"완료된 작업 정리 완료: {entity_type} ({len(pending_ops) - len(active_ops)}개 제거)")
        except Exception as e:
            logger.error(f"완료된 작업 정리 실패: {str(e)}")
            raise
    
    def _json_serializer(self, obj):
        """JSON 직렬화를 위한 기본 변환기."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")


class OfflineManager:
    """오프라인 모드 관리 클래스."""
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """싱글톤 패턴을 위한 인스턴스 관리."""
        if cls._instance is None:
            cls._instance = super(OfflineManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, storage_dir: Optional[str] = None):
        """
        초기화.
        
        Args:
            storage_dir: 오프라인 데이터 저장 디렉토리 (선택적)
        """
        if self._initialized:
            return
            
        self._offline_mode = False
        self._storage_dir = storage_dir or os.path.join(os.path.expanduser("~"), ".maintenance_app", "offline_data")
        self._store = OfflineStoreManager(self._storage_dir)
        self._sync_in_progress = False
        
        self._initialized = True
        logger.info(f"오프라인 매니저 초기화 완료: 저장소={self._storage_dir}")
    
    @property
    def is_offline(self) -> bool:
        """오프라인 모드 여부."""
        return self._offline_mode
    
    @property
    def storage_dir(self) -> str:
        """오프라인 데이터 저장 디렉토리."""
        return self._storage_dir
    
    def set_offline_mode(self, offline: bool):
        """
        오프라인 모드를 설정합니다.
        
        Args:
            offline: 오프라인 모드 여부
        """
        previous = self._offline_mode
        self._offline_mode = offline
        
        if previous != offline:
            logger.info(f"오프라인 모드 변경: {previous} -> {offline}")
    
    def sync_to_offline(self, entity_type: str, entities: List[Dict[str, Any]]):
        """
        온라인 데이터를 오프라인 저장소에 동기화합니다.
        
        Args:
            entity_type: 엔티티 타입
            entities: 동기화할 엔티티 목록
        """
        self._store.save_entities(entity_type, entities)
    
    def get_offline_data(self, entity_type: str) -> List[Dict[str, Any]]:
        """
        오프라인 저장소에서 데이터를 조회합니다.
        
        Args:
            entity_type: 엔티티 타입
            
        Returns:
            List[Dict[str, Any]]: 오프라인 데이터
        """
        return self._store.load_entities(entity_type)
    
    def queue_operation(
        self, 
        entity_type: str, 
        operation_type: PendingOperationType,
        entity_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        오프라인 상태에서 작업을 큐에 추가합니다.
        
        Args:
            entity_type: 엔티티 타입
            operation_type: 작업 타입
            entity_id: 엔티티 ID (선택적)
            data: 작업 데이터 (선택적)
            
        Returns:
            str: 작업 ID
        """
        return self._store.add_pending_operation(entity_type, operation_type, entity_id, data)
    
    def get_pending_operations(self, entity_type: str) -> List[Dict[str, Any]]:
        """
        대기 중인 작업 목록을 조회합니다.
        
        Args:
            entity_type: 엔티티 타입
            
        Returns:
            List[Dict[str, Any]]: 대기 중인 작업 목록
        """
        return self._store.get_pending_operations(entity_type)
    
    def mark_operation_complete(self, entity_type: str, operation_id: str, result: Optional[Dict[str, Any]] = None):
        """
        작업을 완료 상태로 표시합니다.
        
        Args:
            entity_type: 엔티티 타입
            operation_id: 작업 ID
            result: 작업 결과 (선택적)
        """
        self._store.mark_operation_complete(entity_type, operation_id, result)
    
    def clear_completed_operations(self, entity_type: str):
        """
        완료된 작업을 제거합니다.
        
        Args:
            entity_type: 엔티티 타입
        """
        self._store.clear_completed_operations(entity_type)
    
    def has_pending_operations(self, entity_type: Optional[str] = None) -> bool:
        """
        대기 중인 작업이 있는지 확인합니다.
        
        Args:
            entity_type: 엔티티 타입 (선택적)
            
        Returns:
            bool: 대기 중인 작업 존재 여부
        """
        if entity_type:
            pending_ops = self._store.get_pending_operations(entity_type)
            return any(op["status"] == "pending" for op in pending_ops)
        
        # 모든 엔티티 타입에 대해 확인
        entity_types = self._get_all_entity_types()
        for et in entity_types:
            pending_ops = self._store.get_pending_operations(et)
            if any(op["status"] == "pending" for op in pending_ops):
                return True
        
        return False
    
    def _get_all_entity_types(self) -> List[str]:
        """저장소에 존재하는 모든 엔티티 타입을 조회합니다."""
        if not os.path.exists(self._storage_dir):
            return []
            
        entity_types = set()
        for filename in os.listdir(self._storage_dir):
            if filename.endswith('.json'):
                if filename.endswith('_pending.json'):
                    # pending 파일에서 엔티티 타입 추출
                    entity_type = filename[:-13]  # '_pending.json' 제거
                    entity_types.add(entity_type)
                else:
                    # 일반 엔티티 파일에서 엔티티 타입 추출
                    entity_type = filename[:-5]  # '.json' 제거
                    entity_types.add(entity_type)
        
        return list(entity_types)
    
    def apply_offline_operation(
        self,
        entity_type: str,
        operation: Dict[str, Any],
        apply_func: callable
    ):
        """
        오프라인 작업을 적용합니다.
        
        Args:
            entity_type: 엔티티 타입
            operation: 적용할 작업
            apply_func: 작업을 적용할 함수
        """
        try:
            # 작업 적용
            result = apply_func(operation)
            
            # 작업 완료 표시
            self.mark_operation_complete(entity_type, operation["id"], result)
            logger.info(f"오프라인 작업 적용 완료: {entity_type}/{operation['id']}")
            return True
        except Exception as e:
            logger.error(f"오프라인 작업 적용 실패: {entity_type}/{operation['id']} - {str(e)}")
            return False


# 글로벌 인스턴스
offline_manager = OfflineManager() 