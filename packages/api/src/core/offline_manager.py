"""
오프라인 모드 관리 모듈.
"""

import json
import os
import time
import threading
import requests
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Type, TypeVar, Callable
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

class NetworkStatus(str, Enum):
    """네트워크 상태."""
    ONLINE = "online"
    OFFLINE = "offline"
    CHECKING = "checking"
    UNKNOWN = "unknown"

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
    _default_storage_dir = "./offline_storage"
    
    def __new__(cls, *args, **kwargs):
        """싱글톤 패턴 구현."""
        if cls._instance is None:
            cls._instance = super(OfflineManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, storage_dir: Optional[str] = None):
        """
        초기화.
        
        Args:
            storage_dir: 오프라인 데이터 저장 디렉토리 (선택적)
        """
        # 이미 초기화된 경우 중복 초기화 방지
        if hasattr(self, "_initialized") and self._initialized:
            return
            
        self._storage_dir = storage_dir or self._default_storage_dir
        self._offline_mode = False
        self._network_status = NetworkStatus.UNKNOWN
        self._auto_sync_enabled = True
        self._network_check_interval = 60  # 기본 네트워크 확인 간격 (초)
        self._last_network_check = datetime.min
        self._connectivity_endpoints = ["https://www.google.com", "https://www.baidu.com", "https://www.apple.com"]
        self._network_monitor_thread = None
        self._sync_listeners = []
        self._network_status_listeners = []
        
        # 오프라인 저장소 관리자
        self._store = OfflineStoreManager(self._storage_dir)
        
        # 오프라인 모드 상태 로드
        self._load_offline_status()
        
        # 자동 네트워크 모니터링 시작
        self._start_network_monitoring()
        
        self._initialized = True
        
        logger.info(f"오프라인 관리자 초기화 완료 (스토리지: {self._storage_dir})")
        
    def _load_offline_status(self):
        """저장된 오프라인 모드 상태를 로드합니다."""
        status_file = os.path.join(self._storage_dir, "offline_status.json")
        
        if os.path.exists(status_file):
            try:
                with open(status_file, 'r', encoding='utf-8') as f:
                    status = json.load(f)
                self._offline_mode = status.get("offline_mode", False)
                self._auto_sync_enabled = status.get("auto_sync_enabled", True)
                self._network_check_interval = status.get("network_check_interval", 60)
                logger.info(f"오프라인 모드 상태 로드: {self._offline_mode}, 자동 동기화: {self._auto_sync_enabled}")
            except Exception as e:
                logger.error(f"오프라인 모드 상태 로드 실패: {str(e)}")
                self._offline_mode = False
    
    def _save_offline_status(self):
        """현재 오프라인 모드 상태를 저장합니다."""
        status_file = os.path.join(self._storage_dir, "offline_status.json")
        
        try:
            with open(status_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "offline_mode": self._offline_mode,
                    "auto_sync_enabled": self._auto_sync_enabled,
                    "network_check_interval": self._network_check_interval,
                    "updated_at": datetime.now().isoformat()
                }, f, ensure_ascii=False)
            logger.info(f"오프라인 모드 상태 저장: {self._offline_mode}, 자동 동기화: {self._auto_sync_enabled}")
        except Exception as e:
            logger.error(f"오프라인 모드 상태 저장 실패: {str(e)}")
    
    def _start_network_monitoring(self):
        """네트워크 모니터링 스레드를 시작합니다."""
        if self._network_monitor_thread is not None and self._network_monitor_thread.is_alive():
            logger.debug("네트워크 모니터링 스레드가 이미 실행 중입니다.")
            return
            
        self._network_monitor_thread = threading.Thread(
            target=self._network_monitor_task,
            daemon=True,
            name="OfflineNetworkMonitor"
        )
        self._network_monitor_thread.start()
        logger.info("네트워크 모니터링 스레드가 시작되었습니다.")
    
    def _network_monitor_task(self):
        """네트워크 모니터링 태스크."""
        while True:
            try:
                # 네트워크 상태 확인 및 필요시 자동 동기화
                self._check_network_and_sync()
                
                # 설정된 간격만큼 대기
                time.sleep(self._network_check_interval)
            except Exception as e:
                logger.error(f"네트워크 모니터링 중 오류 발생: {str(e)}")
                time.sleep(10)  # 오류 발생 시 짧은 대기
    
    def _check_network_and_sync(self):
        """네트워크 상태를 확인하고 필요한 경우 자동 동기화를 수행합니다."""
        try:
            # 최소 확인 간격 보장
            now = datetime.now()
            if (now - self._last_network_check).total_seconds() < 10:
                return
                
            self._last_network_check = now
            old_status = self._network_status
            self._network_status = NetworkStatus.CHECKING
            
            # 연결성 확인
            is_online = self._check_internet_connectivity()
            
            # 상태 업데이트
            self._network_status = NetworkStatus.ONLINE if is_online else NetworkStatus.OFFLINE
            
            # 상태 변경 시 로깅
            if old_status != self._network_status:
                logger.info(f"네트워크 상태 변경: {old_status} -> {self._network_status}")
                
                # 네트워크 상태 변경 알림
                self._notify_network_status_listeners()
                
                # 온라인 상태로 변경되고 오프라인 모드가 활성화된 경우 자동 동기화 시도
                if self._network_status == NetworkStatus.ONLINE and self._offline_mode and self._auto_sync_enabled:
                    if self.has_pending_operations():
                        logger.info("네트워크 연결이 복원되었습니다. 동기화 가능성을 알립니다.")
                        self._notify_sync_opportunity()
        except Exception as e:
            self._network_status = NetworkStatus.UNKNOWN
            logger.error(f"네트워크 상태 확인 중 오류: {str(e)}")
    
    def _check_internet_connectivity(self) -> bool:
        """인터넷 연결 상태를 확인합니다."""
        # 연결 상태 확인을 위한 엔드포인트 목록에서 하나씩 시도
        for endpoint in self._connectivity_endpoints:
            try:
                # 간단한 HEAD 요청으로 연결성 확인
                response = requests.head(endpoint, timeout=5)
                if response.status_code < 400:  # 2xx, 3xx 상태 코드는 성공으로 간주
                    return True
            except Exception:
                continue  # 다음 엔드포인트 시도
        
        return False  # 모든 엔드포인트 접속 실패
    
    def add_sync_listener(self, listener: Callable[[], None]):
        """
        동기화 기회 알림을 위한 리스너를 추가합니다.
        
        Args:
            listener: 동기화 가능할 때 호출되는 콜백 함수
        """
        if listener not in self._sync_listeners:
            self._sync_listeners.append(listener)
    
    def remove_sync_listener(self, listener: Callable[[], None]):
        """
        동기화 리스너를 제거합니다.
        
        Args:
            listener: 제거할 리스너
        """
        if listener in self._sync_listeners:
            self._sync_listeners.remove(listener)
    
    def _notify_sync_opportunity(self):
        """동기화 기회가 있을 때 등록된 리스너들에게 알립니다."""
        for listener in self._sync_listeners:
            try:
                listener()
            except Exception as e:
                logger.error(f"동기화 리스너 호출 중 오류: {str(e)}")
    
    def add_network_status_listener(self, listener: Callable[[NetworkStatus], None]):
        """
        네트워크 상태 변경 알림을 위한 리스너를 추가합니다.
        
        Args:
            listener: 네트워크 상태가 변경될 때 호출되는 콜백 함수
        """
        if listener not in self._network_status_listeners:
            self._network_status_listeners.append(listener)
    
    def remove_network_status_listener(self, listener: Callable[[NetworkStatus], None]):
        """
        네트워크 상태 리스너를 제거합니다.
        
        Args:
            listener: 제거할 리스너
        """
        if listener in self._network_status_listeners:
            self._network_status_listeners.remove(listener)
    
    def _notify_network_status_listeners(self):
        """네트워크 상태가 변경될 때 등록된 리스너들에게 알립니다."""
        for listener in self._network_status_listeners:
            try:
                listener(self._network_status)
            except Exception as e:
                logger.error(f"네트워크 상태 리스너 호출 중 오류: {str(e)}")
    
    @property
    def is_offline(self) -> bool:
        """오프라인 모드 여부."""
        return self._offline_mode
    
    @property
    def storage_dir(self) -> str:
        """오프라인 데이터 저장 디렉토리."""
        return self._storage_dir
    
    @property
    def network_status(self) -> NetworkStatus:
        """현재 네트워크 상태."""
        return self._network_status
    
    @property
    def auto_sync_enabled(self) -> bool:
        """자동 동기화 활성화 여부."""
        return self._auto_sync_enabled
    
    @auto_sync_enabled.setter
    def auto_sync_enabled(self, value: bool):
        """자동 동기화 설정."""
        if self._auto_sync_enabled != value:
            self._auto_sync_enabled = value
            self._save_offline_status()
            logger.info(f"자동 동기화 설정 변경: {value}")
    
    @property
    def network_check_interval(self) -> int:
        """네트워크 확인 간격 (초)."""
        return self._network_check_interval
    
    @network_check_interval.setter
    def network_check_interval(self, value: int):
        """네트워크 확인 간격 설정."""
        if value < 10:
            value = 10  # 최소 10초 간격 보장
        
        if self._network_check_interval != value:
            self._network_check_interval = value
            self._save_offline_status()
            logger.info(f"네트워크 확인 간격 변경: {value}초")
    
    def check_network_now(self) -> NetworkStatus:
        """
        네트워크 상태를 즉시 확인합니다.
        
        Returns:
            NetworkStatus: 현재 네트워크 상태
        """
        try:
            self._network_status = NetworkStatus.CHECKING
            is_online = self._check_internet_connectivity()
            self._network_status = NetworkStatus.ONLINE if is_online else NetworkStatus.OFFLINE
            self._last_network_check = datetime.now()
            logger.info(f"네트워크 상태 수동 확인 결과: {self._network_status}")
            
            # 상태 변경 알림
            self._notify_network_status_listeners()
            
            return self._network_status
        except Exception as e:
            self._network_status = NetworkStatus.UNKNOWN
            logger.error(f"네트워크 상태 수동 확인 중 오류: {str(e)}")
            return NetworkStatus.UNKNOWN
    
    def set_offline_mode(self, offline: bool):
        """
        오프라인 모드를 설정합니다.
        
        Args:
            offline: 오프라인 모드 활성화 여부
        """
        if self._offline_mode != offline:
            self._offline_mode = offline
            self._save_offline_status()
            
            status_text = "활성화됨" if offline else "비활성화됨"
            logger.info(f"오프라인 모드 {status_text}")
            
            # 오프라인 모드 비활성화 시 보류 중인 작업 동기화 프로세스 시작 알림
            if not offline and self.has_pending_operations() and self._network_status == NetworkStatus.ONLINE:
                logger.info("보류 중인 작업이 있습니다. 동기화 가능성을 알립니다.")
                self._notify_sync_opportunity()
    
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
        오프라인 저장소에서 데이터를 가져옵니다.
        
        Args:
            entity_type: 엔티티 타입
            
        Returns:
            List[Dict[str, Any]]: 엔티티 목록
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
        오프라인 모드에서 작업을 대기열에 추가합니다.
        
        Args:
            entity_type: 엔티티 타입
            operation_type: 작업 타입
            entity_id: 엔티티 ID (선택적)
            data: 작업 데이터 (선택적)
            
        Returns:
            str: 작업 ID
        """
        return self._store.add_pending_operation(
            entity_type=entity_type,
            operation_type=operation_type,
            entity_id=entity_id,
            data=data
        )
    
    def get_pending_operations(self, entity_type: str) -> List[Dict[str, Any]]:
        """
        대기 중인 작업 목록을 가져옵니다.
        
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
            entity_type: 엔티티 타입 (선택적, 없으면 모든 엔티티 확인)
            
        Returns:
            bool: 대기 중인 작업 존재 여부
        """
        if entity_type:
            ops = self.get_pending_operations(entity_type)
            return any(op["status"] == "pending" for op in ops)
        else:
            # 모든 엔티티 타입 확인
            entity_types = self._get_all_entity_types()
            
            for et in entity_types:
                ops = self.get_pending_operations(et)
                if any(op["status"] == "pending" for op in ops):
                    return True
                    
            return False
    
    def _get_all_entity_types(self) -> List[str]:
        """모든 엔티티 타입 목록을 반환합니다."""
        entity_types = []
        
        try:
            for file_name in os.listdir(self._storage_dir):
                if file_name.endswith("_pending.json"):
                    entity_type = file_name.replace("_pending.json", "")
                    entity_types.append(entity_type)
        except Exception as e:
            logger.error(f"엔티티 타입 목록 조회 실패: {str(e)}")
            
        return entity_types
    
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
            apply_func: 작업 적용 함수 (operation을 인자로 받아 결과를 반환)
        """
        try:
            logger.info(f"오프라인 작업 적용 시작: {operation['type']} - {entity_type}/{operation.get('entity_id', 'new')}")
            
            # 작업 적용
            result = apply_func(operation)
            
            # 작업을 완료 상태로 표시
            self.mark_operation_complete(entity_type, operation['id'], result)
            
            logger.info(f"오프라인 작업 적용 완료: {operation['id']}")
            return result
        except Exception as e:
            logger.error(f"오프라인 작업 적용 실패: {str(e)}")
            raise
    
    def sync_pending_operations(self, sync_handlers: Dict[str, Dict[str, callable]] = None):
        """
        모든 보류 중인 오프라인 작업을 온라인 DB에 동기화합니다.
        
        Args:
            sync_handlers: 엔티티 타입별 작업 타입별 동기화 핸들러 함수
                예: {
                    "todos": {
                        "create": create_todo_handler,
                        "update": update_todo_handler,
                        "delete": delete_todo_handler
                    }
                }
        
        Returns:
            Dict[str, Any]: 동기화 결과 요약
        """
        # 네트워크 상태 확인
        if self._network_status != NetworkStatus.ONLINE:
            current_status = self.check_network_now()
            if current_status != NetworkStatus.ONLINE:
                logger.warning(f"네트워크 연결이 없습니다. 동기화를 수행할 수 없습니다 ({current_status}).")
                return {
                    "status": "failed", 
                    "reason": "network_unavailable",
                    "network_status": current_status
                }
        
        if not sync_handlers:
            logger.warning("동기화 핸들러가 제공되지 않았습니다. 기본 동기화를 수행할 수 없습니다.")
            return {"status": "failed", "reason": "no_handlers_provided"}
            
        if self.is_offline:
            logger.warning("오프라인 모드에서는 동기화를 수행할 수 없습니다.")
            return {"status": "failed", "reason": "offline_mode_active"}
            
        entity_types = self._get_all_entity_types()
        
        if not entity_types:
            logger.info("동기화할 보류 중인 작업이 없습니다.")
            return {"status": "success", "message": "no_pending_operations"}
            
        results = {
            "status": "success",
            "synchronized": 0,
            "failed": 0,
            "skipped": 0,
            "entity_results": {}
        }
        
        for entity_type in entity_types:
            # 핸들러가 없는 엔티티 타입 건너뛰기
            if entity_type not in sync_handlers:
                logger.warning(f"'{entity_type}' 유형에 대한 동기화 핸들러가 없습니다. 건너뜁니다.")
                results["skipped"] += 1
                continue
                
            entity_handlers = sync_handlers[entity_type]
            pending_ops = self.get_pending_operations(entity_type)
            
            # 보류 중인 작업만 필터링
            pending_ops = [op for op in pending_ops if op["status"] == "pending"]
            
            if not pending_ops:
                logger.info(f"'{entity_type}' 유형에 대한 보류 중인 작업이 없습니다.")
                continue
                
            entity_results = {
                "total": len(pending_ops),
                "success": 0,
                "failed": 0
            }
            
            # 작업 시간순 정렬
            pending_ops.sort(key=lambda op: op["timestamp"])
            
            for operation in pending_ops:
                op_type = operation["type"]
                
                if op_type not in entity_handlers:
                    logger.warning(f"'{entity_type}' 유형의 '{op_type}' 작업에 대한 핸들러가 없습니다. 건너뜁니다.")
                    results["skipped"] += 1
                    continue
                    
                handler = entity_handlers[op_type]
                
                try:
                    # 동기화를 시도하는 동안 연결 문제가 발생하면 백오프
                    if self._network_status != NetworkStatus.ONLINE:
                        logger.warning("네트워크 연결이 끊어졌습니다. 동기화를 중단합니다.")
                        results["status"] = "interrupted"
                        break
                        
                    # 핸들러 호출
                    result = handler(operation)
                    
                    # 작업을 완료 상태로 표시
                    self.mark_operation_complete(entity_type, operation["id"], result)
                    
                    entity_results["success"] += 1
                    results["synchronized"] += 1
                    
                    logger.info(f"오프라인 작업 동기화 성공: {entity_type}/{op_type}/{operation.get('entity_id', 'new')}")
                except Exception as e:
                    entity_results["failed"] += 1
                    results["failed"] += 1
                    
                    logger.error(f"오프라인 작업 동기화 실패: {entity_type}/{op_type}/{operation.get('entity_id', 'new')} - {str(e)}")
            
            # 엔티티 유형별 결과 저장
            results["entity_results"][entity_type] = entity_results
            
            # 완료된 작업 정리 (선택적)
            if entity_results["success"] > 0:
                self.clear_completed_operations(entity_type)
        
        # 오프라인 모드가 자동으로 활성화된 경우에는 동기화 후 비활성화
        if self.is_offline and results["status"] == "success" and results["failed"] == 0:
            logger.info("모든 오프라인 작업이 성공적으로 동기화되었습니다. 오프라인 모드를 비활성화합니다.")
            self.set_offline_mode(False)
        
        return results
    
    def validate_offline_cache(self, entity_types: List[str] = None) -> Dict[str, Any]:
        """
        오프라인 캐시 데이터의 유효성을 검사하고 필요한 경우 복구합니다.
        
        Args:
            entity_types: 검증할 엔티티 타입 목록 (기본값: 모든 타입)
            
        Returns:
            Dict[str, Any]: 검증 결과
        """
        if not entity_types:
            # 모든 엔티티 타입 조회
            entity_types = []
            
            try:
                for file_name in os.listdir(self._storage_dir):
                    if file_name.endswith(".json") and not file_name.endswith("_pending.json") and file_name != "offline_status.json":
                        entity_type = file_name.replace(".json", "")
                        entity_types.append(entity_type)
            except Exception as e:
                logger.error(f"엔티티 타입 목록 조회 실패: {str(e)}")
                return {"status": "failed", "reason": str(e)}
        
        if not entity_types:
            return {"status": "success", "message": "no_entity_types_found"}
            
        results = {
            "status": "success",
            "validated": len(entity_types),
            "valid": 0,
            "repaired": 0,
            "failed": 0,
            "entity_results": {}
        }
        
        for entity_type in entity_types:
            try:
                # 엔티티 데이터 파일 경로
                file_path = os.path.join(self._storage_dir, f"{entity_type}.json")
                
                if not os.path.exists(file_path):
                    logger.warning(f"'{entity_type}' 유형의 캐시 파일이 없습니다.")
                    results["entity_results"][entity_type] = {"status": "skipped", "reason": "file_not_found"}
                    continue
                
                # 파일 내용 검증
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        entities = json.load(f)
                        
                    # 기본 유효성 검사
                    if not isinstance(entities, list):
                        raise ValueError(f"'{entity_type}' 캐시 데이터가 리스트 형식이 아닙니다.")
                        
                    # 각 항목 기본 구조 확인 (옵션)
                    # 여기서 추가 검증 로직 구현 가능
                    
                    results["valid"] += 1
                    results["entity_results"][entity_type] = {
                        "status": "valid", 
                        "count": len(entities)
                    }
                    
                except json.JSONDecodeError as e:
                    logger.error(f"'{entity_type}' 캐시 파일이 유효한 JSON 형식이 아닙니다: {str(e)}")
                    
                    # 백업 생성
                    backup_path = f"{file_path}.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    try:
                        import shutil
                        shutil.copy2(file_path, backup_path)
                        logger.info(f"손상된 캐시 파일 백업 생성: {backup_path}")
                        
                        # 빈 파일로 재생성
                        with open(file_path, 'w', encoding='utf-8') as f:
                            json.dump([], f)
                            
                        results["repaired"] += 1
                        results["entity_results"][entity_type] = {
                            "status": "repaired", 
                            "action": "reset_to_empty",
                            "backup": backup_path
                        }
                        
                    except Exception as backup_err:
                        logger.error(f"손상된 캐시 파일 복구 실패: {str(backup_err)}")
                        results["failed"] += 1
                        results["entity_results"][entity_type] = {
                            "status": "failed", 
                            "reason": str(backup_err)
                        }
            
            except Exception as e:
                logger.error(f"'{entity_type}' 캐시 검증 중 오류 발생: {str(e)}")
                results["failed"] += 1
                results["entity_results"][entity_type] = {
                    "status": "failed", 
                    "reason": str(e)
                }
                
        if results["failed"] > 0:
            results["status"] = "partial"
            
        return results
        
    def get_sync_status(self) -> Dict[str, Any]:
        """
        현재 동기화 상태 정보를 반환합니다.
        
        Returns:
            Dict[str, Any]: 동기화 상태 정보
        """
        pending_count = 0
        entity_counts = {}
        
        # 모든 엔티티 타입별 대기 중인 작업 수 계산
        entity_types = self._get_all_entity_types()
        for entity_type in entity_types:
            ops = self.get_pending_operations(entity_type)
            pending_ops = [op for op in ops if op["status"] == "pending"]
            if pending_ops:
                entity_counts[entity_type] = len(pending_ops)
                pending_count += len(pending_ops)
        
        return {
            "network_status": self._network_status,
            "offline_mode": self._offline_mode,
            "auto_sync_enabled": self._auto_sync_enabled,
            "pending_operations": pending_count,
            "entity_counts": entity_counts,
            "can_sync": self._network_status == NetworkStatus.ONLINE and pending_count > 0 and not self._offline_mode,
            "last_check": self._last_network_check.isoformat() if self._last_network_check else None
        }

# 오프라인 관리자 싱글톤 인스턴스
offline_manager = OfflineManager()