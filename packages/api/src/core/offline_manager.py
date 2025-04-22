"""
오프라인 모드 관리 모듈.

필수 패키지:
- cryptography: 데이터 암호화 (pip install cryptography)
- psutil: 시스템 리소스 모니터링 (pip install psutil)
"""

import base64
import functools
import hashlib
import inspect
import json
import logging
import os
import shutil
import threading
import time
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import (Any, Callable, Dict, Generator, List, Optional, Set, Tuple,
                    Type, TypeVar, Union, cast)

import requests

try:
    import psutil

    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

try:
    from cryptography.fernet import Fernet

    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False

from packages.api.src.core.logging import get_logger

logger = get_logger("offline_manager")

T = TypeVar("T")
EntityType = str
EntityId = str
EntityData = Dict[str, Any]


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
        """엔티티를 저장합니다."""
        file_path = self._get_entity_file_path(entity_type)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(entities, f, ensure_ascii=False, default=self._json_serializer)

    def load_entities(self, entity_type: str) -> List[Dict[str, Any]]:
        """엔티티를 로드합니다."""
        file_path = self._get_entity_file_path(entity_type)
        if not os.path.exists(file_path):
            return []

        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def add_pending_operation(
        self,
        entity_type: str,
        operation_type: PendingOperationType,
        entity_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """대기 중인 작업을 추가합니다."""
        operations = self._load_pending_operations(entity_type)
        operation_id = str(uuid.uuid4())

        operation = {
            "id": operation_id,
            "type": operation_type.value,  # 열거형 값을 문자열로 저장
            "entity_id": entity_id,
            "data": data,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }

        operations.append(operation)
        self._save_pending_operations(entity_type, operations)

        return operation_id

    def _load_pending_operations(self, entity_type: str) -> List[Dict[str, Any]]:
        """대기 중인 작업을 로드합니다."""
        file_path = self._get_pending_ops_file_path(entity_type)
        if not os.path.exists(file_path):
            return []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:  # 빈 파일인 경우
                    return []
                return json.loads(content)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"대기 중인 작업 파일 로드 실패 ({file_path}): {str(e)}")
            # 손상된 파일 백업
            backup_path = f"{file_path}.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            try:
                import shutil

                shutil.copy2(file_path, backup_path)
                logger.info(f"손상된 파일 백업 생성: {backup_path}")
            except Exception as backup_err:
                logger.error(f"파일 백업 실패: {str(backup_err)}")
            return []

    def _save_pending_operations(
        self, entity_type: str, operations: List[Dict[str, Any]]
    ):
        """대기 중인 작업을 저장합니다."""
        file_path = self._get_pending_ops_file_path(entity_type)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(
                    operations, f, ensure_ascii=False, default=self._json_serializer
                )
        except Exception as e:
            logger.error(f"대기 중인 작업 저장 실패: {str(e)}")
            raise

    def get_pending_operations(self, entity_type: str) -> List[Dict[str, Any]]:
        """대기 중인 작업 목록을 가져옵니다."""
        return self._load_pending_operations(entity_type)

    def mark_operation_complete(
        self,
        entity_type: str,
        operation_id: str,
        result: Optional[Dict[str, Any]] = None,
    ):
        """작업을 완료 상태로 표시합니다."""
        operations = self._load_pending_operations(entity_type)
        for operation in operations:
            if operation["id"] == operation_id:
                operation["status"] = "completed"
                operation["completed_at"] = datetime.now().isoformat()
                if result:
                    operation["result"] = result
                break

        self._save_pending_operations(entity_type, operations)

    def clear_completed_operations(self, entity_type: str):
        """완료된 작업을 제거합니다."""
        operations = self._load_pending_operations(entity_type)
        pending_operations = [op for op in operations if op["status"] == "pending"]
        self._save_pending_operations(entity_type, pending_operations)

    def _json_serializer(self, obj):
        """JSON 직렬화를 위한 커스텀 직렬화기."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")


class OfflineManager:
    """오프라인 모드 관리 클래스."""

    def __new__(cls, *args, **kwargs):
        """싱글톤 패턴 구현."""
        if not hasattr(cls, "_instance"):
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

        # 싱글톤 인스턴스 및 기본 설정 초기화
        self._instance = None
        self._default_storage_dir = "./offline_storage"

        # 충돌 해결 전략 상수
        self.CONFLICT_STRATEGY_SERVER_WINS = "server_wins"
        self.CONFLICT_STRATEGY_CLIENT_WINS = "client_wins"
        self.CONFLICT_STRATEGY_NEWEST_WINS = "newest_wins"
        self.CONFLICT_STRATEGY_MANUAL = "manual"

        # 로그 레벨 상수
        self.LOG_LEVEL_DEBUG = logging.DEBUG
        self.LOG_LEVEL_INFO = logging.INFO
        self.LOG_LEVEL_WARNING = logging.WARNING
        self.LOG_LEVEL_ERROR = logging.ERROR

        # 기본 구성 초기화
        self._init_basic_config(storage_dir)

        # 스레드 관련 구성 초기화
        self._init_threading_config()

        # 오류 처리 구성 초기화
        self._init_error_handling_config()

        # 이벤트 리스너 초기화
        self._init_listeners()

        # 저장소 초기화
        self._init_storage()

        # 성능 모니터링 초기화
        self._init_performance_monitoring()

        # 암호화 초기화
        self._init_encryption()

        # 캐싱 초기화
        self._init_caching()

        # 충돌 해결 초기화
        self._init_conflict_resolution()

        # 오프라인 모드 상태 로드
        self._load_offline_status()

        # 자동 네트워크 모니터링 시작
        self._start_network_monitoring()

        self._initialized = True

        logger.info(f"오프라인 관리자 초기화 완료 (스토리지: {self._storage_dir})")

        # 버전 및 마이그레이션 확인
        migration_info = self.check_for_migration()
        if migration_info["needs_migration"]:
            logger.warning(
                f"저장소 마이그레이션이 필요합니다: {migration_info['from_version']} -> {migration_info['to_version']}"
            )
            # 자동 마이그레이션 수행
            self._auto_migrate()
        else:
            # 저장소 버전 정보가 없는 경우 설정
            if self.get_storage_version() is None:
                self.set_storage_version()

    def _auto_migrate(self) -> None:
        """
        시스템 설정에 따라 자동 마이그레이션을 수행합니다.
        이 기능은 기본적으로 비활성화되어 있으며, AUTO_MIGRATE 환경 변수로 제어할 수 있습니다.
        """
        auto_migrate = os.environ.get("AUTO_MIGRATE", "").lower() in (
            "true",
            "1",
            "yes",
        )

        if auto_migrate:
            logger.info("자동 마이그레이션을 수행합니다...")
            try:
                result = self.migrate_storage(backup=True)
                if result["status"] == "success":
                    logger.info(
                        f"마이그레이션 성공: {result['from_version']} -> {result['to_version']}"
                    )
                else:
                    logger.error(f"마이그레이션 실패: {result['message']}")
            except Exception as e:
                logger.error(f"마이그레이션 중 오류 발생: {str(e)}")
        else:
            logger.warning(
                "자동 마이그레이션이 비활성화되어 있습니다. 수동으로 migrate_storage() 메서드를 호출하세요."
            )

    def _init_basic_config(self, storage_dir: Optional[str]):
        """기본 구성 초기화"""
        self._storage_dir = storage_dir or self._default_storage_dir
        self._offline_mode = False
        self._network_status = NetworkStatus.UNKNOWN
        self._auto_sync_enabled = True
        self._network_check_interval = 60  # 기본 네트워크 확인 간격 (초)
        self._last_network_check = datetime.min
        self._connectivity_endpoints = [
            "https://www.google.com",
            "https://www.baidu.com",
            "https://www.apple.com",
        ]

    def _init_threading_config(self):
        """스레드 관련 구성 초기화"""
        self._network_monitor_thread = None
        self._stop_monitoring = False
        self._thread_lock = threading.RLock()  # 재진입 가능한 락 추가

    def _init_error_handling_config(self):
        """오류 처리 구성 초기화"""
        self._max_retries = 3
        self._retry_delay = 5
        self._network_error_handler = None
        self._task_error_handler = None

    def _init_listeners(self):
        """이벤트 리스너 초기화"""
        self._sync_listeners = []
        self._network_status_listeners = []

    def _init_storage(self):
        """저장소 초기화"""
        self._store = OfflineStoreManager(self._storage_dir)

    def _init_performance_monitoring(self):
        """성능 모니터링 초기화"""
        self._performance_metrics = {
            "operations": {},
            "network_checks": [],
            "sync_operations": [],
        }
        self._metrics_enabled = False

    def _init_encryption(self):
        """암호화 초기화"""
        self._encryption_enabled = False
        self._encryption_key = None

    def _init_caching(self):
        """캐싱 초기화"""
        self._memory_cache = {}
        self._cache_ttl = 300  # 기본 캐시 TTL (초)
        self._cache_enabled = False
        self._cache_timestamps = {}
        self._cache_hits = 0
        self._cache_misses = 0

    def _init_conflict_resolution(self):
        """충돌 해결 초기화"""
        self._conflict_strategy = self.CONFLICT_STRATEGY_SERVER_WINS
        self._conflict_resolution_handler = None

    def _load_offline_status(self):
        """저장된 오프라인 모드 상태를 로드합니다."""
        status_file = os.path.join(self._storage_dir, "offline_status.json")

        if os.path.exists(status_file):
            try:
                with open(status_file, "r", encoding="utf-8") as f:
                    status = json.load(f)
                self._offline_mode = status.get("offline_mode", False)
                self._auto_sync_enabled = status.get("auto_sync_enabled", True)
                self._network_check_interval = status.get("network_check_interval", 60)
                logger.info(
                    f"오프라인 모드 상태 로드: {self._offline_mode}, 자동 동기화: {self._auto_sync_enabled}"
                )
            except Exception as e:
                logger.error(f"오프라인 모드 상태 로드 실패: {str(e)}")
                self._offline_mode = False

    def _save_offline_status(self):
        """현재 오프라인 모드 상태를 저장합니다."""
        status_file = os.path.join(self._storage_dir, "offline_status.json")

        try:
            with open(status_file, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "offline_mode": self._offline_mode,
                        "auto_sync_enabled": self._auto_sync_enabled,
                        "network_check_interval": self._network_check_interval,
                        "updated_at": datetime.now().isoformat(),
                    },
                    f,
                    ensure_ascii=False,
                )
            logger.info(
                f"오프라인 모드 상태 저장: {self._offline_mode}, 자동 동기화: {self._auto_sync_enabled}"
            )
        except Exception as e:
            logger.error(f"오프라인 모드 상태 저장 실패: {str(e)}")

    def _start_network_monitoring(self):
        """네트워크 모니터링 스레드를 시작합니다."""
        if (
            self._network_monitor_thread is not None
            and self._network_monitor_thread.is_alive()
        ):
            logger.debug("네트워크 모니터링 스레드가 이미 실행 중입니다.")
            return

        self._network_monitor_thread = threading.Thread(
            target=self._network_monitor_task, daemon=True, name="OfflineNetworkMonitor"
        )
        self._network_monitor_thread.start()
        logger.info("네트워크 모니터링 스레드가 시작되었습니다.")

    def restart_network_monitoring(self):
        """
        네트워크 모니터링을 재시작합니다.
        기존 모니터링이 실행 중이면 중지 후 재시작합니다.
        """
        self.stop_network_monitoring()
        time.sleep(1)  # 스레드 정리를 위한 짧은 대기
        self._start_network_monitoring()
        logger.info("네트워크 모니터링이 재시작되었습니다.")

    def stop_network_monitoring(self):
        """
        네트워크 모니터링 스레드를 중지합니다.
        참고: Python의 스레드 모델 상 실행 중인 스레드를 강제 종료하는 안전한 방법은 없습니다.
        따라서 이 메서드는 모니터링 스레드를 중지하는 플래그를 설정하고, 스레드가 자연스럽게 종료되기를 기다립니다.
        """
        if hasattr(self, "_stop_monitoring") and not self._stop_monitoring:
            self._stop_monitoring = True
            logger.info("네트워크 모니터링 중지 요청이 설정되었습니다.")
            return True
        return False

    def _network_monitor_task(self):
        """네트워크 모니터링 태스크."""
        # 스레드 중지 플래그 초기화
        self._stop_monitoring = False

        while not self._stop_monitoring:
            try:
                # 네트워크 상태 확인 및 필요시 자동 동기화
                self._check_network_and_sync()

                # 설정된 간격만큼 대기
                for _ in range(self._network_check_interval):
                    if self._stop_monitoring:
                        break
                    time.sleep(1)  # 1초 단위로 체크하여 빠른 중지 가능
            except Exception as e:
                logger.error(f"네트워크 모니터링 중 오류 발생: {str(e)}")
                time.sleep(10)  # 오류 발생 시 짧은 대기

        logger.info("네트워크 모니터링 스레드가 종료되었습니다.")
        self._network_monitor_thread = None

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
            self._network_status = (
                NetworkStatus.ONLINE if is_online else NetworkStatus.OFFLINE
            )

            # 상태 변경 시 로깅
            if old_status != self._network_status:
                logger.info(
                    f"네트워크 상태 변경: {old_status} -> {self._network_status}"
                )

                # 네트워크 상태 변경 알림
                self._notify_network_status_listeners()

                # 온라인 상태로 변경되고 오프라인 모드가 활성화된 경우 자동 동기화 시도
                if (
                    self._network_status == NetworkStatus.ONLINE
                    and self._offline_mode
                    and self._auto_sync_enabled
                ):
                    if self.has_pending_operations():
                        logger.info(
                            "네트워크 연결이 복원되었습니다. 동기화 가능성을 알립니다."
                        )
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
            self._network_status = (
                NetworkStatus.ONLINE if is_online else NetworkStatus.OFFLINE
            )
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
            if (
                not offline
                and self.has_pending_operations()
                and self._network_status == NetworkStatus.ONLINE
            ):
                logger.info("보류 중인 작업이 있습니다. 동기화 가능성을 알립니다.")
                self._notify_sync_opportunity()

    def sync_to_offline(
        self, entity_type: EntityType, entities: List[EntityData]
    ) -> None:
        """
        온라인 데이터를 오프라인 저장소에 동기화합니다.
        캐시가 활성화된 경우 캐시도 갱신합니다.

        Args:
            entity_type: 엔티티 타입
            entities: 동기화할 엔티티 목록
        """
        # 빈 목록 검사로 불필요한 디스크 I/O 방지
        if not entities and not os.path.exists(
            os.path.join(self._storage_dir, f"{entity_type}.json")
        ):
            logger.debug(
                f"{entity_type}에 대한 동기화 건너뜀 (빈 목록이고 파일이 없음)"
            )
            return

        # 성능 측정 시작
        start_time = time.time()

        # 데이터 저장 전에 메타데이터 추가
        entities_with_metadata = []
        timestamp = datetime.now().isoformat()

        for entity in entities:
            entity_copy = entity.copy()  # 원본 데이터 변경 방지
            if "_metadata" not in entity_copy:
                entity_copy["_metadata"] = {}

            entity_copy["_metadata"].update(
                {"synchronized_at": timestamp, "version": self.VERSION}
            )
            entities_with_metadata.append(entity_copy)

        # 데이터 저장
        self._store.save_entities(entity_type, entities_with_metadata)

        # 성능 지표 기록
        if self._metrics_enabled:
            elapsed = time.time() - start_time
            self.record_operation_time(f"sync_{entity_type}", elapsed)
            self.record_sync_operation(
                entity_type,
                "sync_to_offline",
                "success",
                elapsed,
                {"count": len(entities)},
            )

        # 캐시가 활성화된 경우 캐시 갱신
        if self._cache_enabled:
            with self._thread_lock:  # 스레드 안전성 보장
                self._memory_cache[entity_type] = entities_with_metadata
                self._cache_timestamps[entity_type] = time.time()
                logger.debug(f"{entity_type} 데이터 캐시 갱신 (동기화 후)")

        # 마지막 동기화 시간 갱신
        self.set_last_sync_time(entity_type)

    def get_offline_data(self, entity_type: EntityType) -> List[EntityData]:
        """
        오프라인 저장소에서 데이터를 가져옵니다.
        캐시가 활성화된 경우 캐시에서 먼저 조회합니다.

        Args:
            entity_type: 엔티티 타입

        Returns:
            List[Dict[str, Any]]: 엔티티 목록
        """
        # 캐시가 활성화된 경우 캐시에서 먼저 조회
        if self._cache_enabled and entity_type in self._memory_cache:
            with self._thread_lock:  # 스레드 안전성 보장
                cache_time = self._cache_timestamps.get(entity_type, 0)
                if (time.time() - cache_time) < self._cache_ttl:
                    self._cache_hits += 1
                    logger.debug(
                        f"{entity_type} 데이터 캐시 적중 (캐시 나이: {int(time.time() - cache_time)}초)"
                    )
                    return self._memory_cache[entity_type]
                else:
                    # TTL 초과로 캐시 무효화
                    logger.debug(f"{entity_type} 캐시 TTL 초과로 무효화")
                    del self._memory_cache[entity_type]
                    if entity_type in self._cache_timestamps:
                        del self._cache_timestamps[entity_type]

        # 캐시 미스 또는 비활성화
        self._cache_misses += 1

        # 성능 측정 시작
        start_time = time.time()

        # 데이터 로드
        data = self._store.load_entities(entity_type)

        # 성능 지표 기록
        if self._metrics_enabled:
            elapsed = time.time() - start_time
            self.record_operation_time(f"load_{entity_type}", elapsed)

        # 캐시 갱신
        if self._cache_enabled:
            with self._thread_lock:  # 스레드 안전성 보장
                self._memory_cache[entity_type] = data
                self._cache_timestamps[entity_type] = time.time()
                logger.debug(f"{entity_type} 데이터 캐시 갱신 (항목 수: {len(data)})")

        return data

    def queue_operation(
        self,
        entity_type: str,
        operation_type: PendingOperationType,
        entity_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
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
            data=data,
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

    def mark_operation_complete(
        self,
        entity_type: str,
        operation_id: str,
        result: Optional[Dict[str, Any]] = None,
    ):
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
        self, entity_type: str, operation: Dict[str, Any], apply_func: callable
    ):
        """
        오프라인 작업을 적용합니다.

        Args:
            entity_type: 엔티티 타입
            operation: 적용할 작업
            apply_func: 작업 적용 함수 (operation을 인자로 받아 결과를 반환)
        """
        try:
            logger.info(
                f"오프라인 작업 적용 시작: {operation['type']} - {entity_type}/{operation.get('entity_id', 'new')}"
            )

            # 작업 적용
            result = apply_func(operation)

            # 작업을 완료 상태로 표시
            self.mark_operation_complete(entity_type, operation["id"], result)

            logger.info(f"오프라인 작업 적용 완료: {operation['id']}")
            return result
        except Exception as e:
            logger.error(f"오프라인 작업 적용 실패: {str(e)}")
            raise

    def sync_pending_operations(
        self, sync_handlers: Dict[str, Dict[str, callable]] = None
    ):
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
                logger.warning(
                    f"네트워크 연결이 없습니다. 동기화를 수행할 수 없습니다 ({current_status})."
                )
                return {
                    "status": "failed",
                    "reason": "network_unavailable",
                    "network_status": current_status,
                }

        if not sync_handlers:
            logger.warning(
                "동기화 핸들러가 제공되지 않았습니다. 기본 동기화를 수행할 수 없습니다."
            )
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
            "entity_results": {},
        }

        for entity_type in entity_types:
            # 핸들러가 없는 엔티티 타입 건너뛰기
            if entity_type not in sync_handlers:
                logger.warning(
                    f"'{entity_type}' 유형에 대한 동기화 핸들러가 없습니다. 건너뜁니다."
                )
                results["skipped"] += 1
                continue

            entity_handlers = sync_handlers[entity_type]
            pending_ops = self.get_pending_operations(entity_type)

            # 보류 중인 작업만 필터링
            pending_ops = [op for op in pending_ops if op["status"] == "pending"]

            if not pending_ops:
                logger.info(f"'{entity_type}' 유형에 대한 보류 중인 작업이 없습니다.")
                continue

            entity_results = {"total": len(pending_ops), "success": 0, "failed": 0}

            # 작업 시간순 정렬
            pending_ops.sort(key=lambda op: op["timestamp"])

            for operation in pending_ops:
                op_type = operation["type"]

                if op_type not in entity_handlers:
                    logger.warning(
                        f"'{entity_type}' 유형의 '{op_type}' 작업에 대한 핸들러가 없습니다. 건너뜁니다."
                    )
                    results["skipped"] += 1
                    continue

                handler = entity_handlers[op_type]

                try:
                    # 동기화를 시도하는 동안 연결 문제가 발생하면 백오프
                    if self._network_status != NetworkStatus.ONLINE:
                        logger.warning(
                            "네트워크 연결이 끊어졌습니다. 동기화를 중단합니다."
                        )
                        results["status"] = "interrupted"
                        break

                    # 핸들러 호출
                    result = handler(operation)

                    # 작업을 완료 상태로 표시
                    self.mark_operation_complete(entity_type, operation["id"], result)

                    entity_results["success"] += 1
                    results["synchronized"] += 1

                    logger.info(
                        f"오프라인 작업 동기화 성공: {entity_type}/{op_type}/{operation.get('entity_id', 'new')}"
                    )
                except Exception as e:
                    entity_results["failed"] += 1
                    results["failed"] += 1

                    logger.error(
                        f"오프라인 작업 동기화 실패: {entity_type}/{op_type}/{operation.get('entity_id', 'new')} - {str(e)}"
                    )

            # 엔티티 유형별 결과 저장
            results["entity_results"][entity_type] = entity_results

            # 완료된 작업 정리 (선택적)
            if entity_results["success"] > 0:
                self.clear_completed_operations(entity_type)

        # 오프라인 모드가 자동으로 활성화된 경우에는 동기화 후 비활성화
        if (
            self.is_offline
            and results["status"] == "success"
            and results["failed"] == 0
        ):
            logger.info(
                "모든 오프라인 작업이 성공적으로 동기화되었습니다. 오프라인 모드를 비활성화합니다."
            )
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
                    if (
                        file_name.endswith(".json")
                        and not file_name.endswith("_pending.json")
                        and file_name != "offline_status.json"
                    ):
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
            "entity_results": {},
        }

        for entity_type in entity_types:
            try:
                # 엔티티 데이터 파일 경로
                file_path = os.path.join(self._storage_dir, f"{entity_type}.json")

                if not os.path.exists(file_path):
                    logger.warning(f"'{entity_type}' 유형의 캐시 파일이 없습니다.")
                    results["entity_results"][entity_type] = {
                        "status": "skipped",
                        "reason": "file_not_found",
                    }
                    continue

                # 파일 내용 검증
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        entities = json.load(f)

                    # 기본 유효성 검사
                    if not isinstance(entities, list):
                        raise ValueError(
                            f"'{entity_type}' 캐시 데이터가 리스트 형식이 아닙니다."
                        )

                    # 각 항목 기본 구조 확인 (옵션)
                    # 여기서 추가 검증 로직 구현 가능

                    results["valid"] += 1
                    results["entity_results"][entity_type] = {
                        "status": "valid",
                        "count": len(entities),
                    }

                except json.JSONDecodeError as e:
                    logger.error(
                        f"'{entity_type}' 캐시 파일이 유효한 JSON 형식이 아닙니다: {str(e)}"
                    )

                    # 백업 생성
                    backup_path = (
                        f"{file_path}.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    )
                    try:
                        import shutil

                        shutil.copy2(file_path, backup_path)
                        logger.info(f"손상된 캐시 파일 백업 생성: {backup_path}")

                        # 빈 파일로 재생성
                        with open(file_path, "w", encoding="utf-8") as f:
                            json.dump([], f)

                        results["repaired"] += 1
                        results["entity_results"][entity_type] = {
                            "status": "repaired",
                            "action": "reset_to_empty",
                            "backup": backup_path,
                        }

                    except Exception as backup_err:
                        logger.error(f"손상된 캐시 파일 복구 실패: {str(backup_err)}")
                        results["failed"] += 1
                        results["entity_results"][entity_type] = {
                            "status": "failed",
                            "reason": str(backup_err),
                        }

            except Exception as e:
                logger.error(f"'{entity_type}' 캐시 검증 중 오류 발생: {str(e)}")
                results["failed"] += 1
                results["entity_results"][entity_type] = {
                    "status": "failed",
                    "reason": str(e),
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
            "can_sync": self._network_status == NetworkStatus.ONLINE
            and pending_count > 0
            and not self._offline_mode,
            "last_check": (
                self._last_network_check.isoformat()
                if self._last_network_check
                else None
            ),
        }

    def get_last_sync_time(self, entity_type: str) -> Optional[float]:
        """
        엔티티 타입의 마지막 동기화 시간을 반환합니다.

        Args:
            entity_type: 엔티티 타입

        Returns:
            Optional[float]: 마지막 동기화 시간(timestamp), 없으면 None
        """
        sync_file = os.path.join(self._storage_dir, f"{entity_type}_sync_time.json")

        if not os.path.exists(sync_file):
            return None

        try:
            with open(sync_file, "r", encoding="utf-8") as f:
                sync_data = json.load(f)
                return sync_data.get("timestamp")
        except Exception as e:
            logger.error(f"{entity_type} 마지막 동기화 시간 로드 실패: {str(e)}")
            return None

    def set_last_sync_time(self, entity_type: str, timestamp: Optional[float] = None):
        """
        엔티티 타입의 마지막 동기화 시간을 설정합니다.

        Args:
            entity_type: 엔티티 타입
            timestamp: 설정할 timestamp, None이면 현재 시간 사용
        """
        if timestamp is None:
            timestamp = time.time()

        sync_file = os.path.join(self._storage_dir, f"{entity_type}_sync_time.json")

        try:
            sync_data = {
                "entity_type": entity_type,
                "timestamp": timestamp,
                "datetime": datetime.fromtimestamp(timestamp).isoformat(),
            }

            with open(sync_file, "w", encoding="utf-8") as f:
                json.dump(sync_data, f, ensure_ascii=False)

            logger.info(
                f"{entity_type} 마지막 동기화 시간 설정: {sync_data['datetime']}"
            )
        except Exception as e:
            logger.error(f"{entity_type} 마지막 동기화 시간 설정 실패: {str(e)}")

    def set_connectivity_endpoints(self, endpoints: List[str]):
        """
        연결성 확인에 사용할 엔드포인트 목록을 설정합니다.

        Args:
            endpoints: 엔드포인트 URL 목록 (최소 1개 이상)
        """
        if not endpoints or not isinstance(endpoints, list):
            raise ValueError("최소 하나 이상의 엔드포인트가 필요합니다")

        self._connectivity_endpoints = endpoints
        logger.info(f"연결성 확인 엔드포인트 설정: {', '.join(endpoints)}")

    def get_connectivity_endpoints(self) -> List[str]:
        """
        현재 설정된 연결성 확인 엔드포인트 목록을 반환합니다.

        Returns:
            List[str]: 엔드포인트 URL 목록
        """
        return self._connectivity_endpoints.copy()

    def test_endpoint_connectivity(
        self, endpoint: str, timeout: int = 5
    ) -> Dict[str, Any]:
        """
        특정 엔드포인트의 연결성을 테스트합니다.

        Args:
            endpoint: 테스트할 엔드포인트 URL
            timeout: 요청 타임아웃 (초)

        Returns:
            Dict[str, Any]: 테스트 결과
        """
        start_time = time.time()
        result = {
            "endpoint": endpoint,
            "reachable": False,
            "elapsed_ms": 0,
            "status_code": None,
            "error": None,
        }

        try:
            response = requests.head(endpoint, timeout=timeout)
            elapsed = time.time() - start_time
            result["elapsed_ms"] = int(elapsed * 1000)
            result["status_code"] = response.status_code
            result["reachable"] = response.status_code < 400
        except requests.exceptions.ConnectTimeout:
            result["error"] = "connection_timeout"
        except requests.exceptions.ReadTimeout:
            result["error"] = "read_timeout"
        except requests.exceptions.ConnectionError:
            result["error"] = "connection_error"
        except Exception as e:
            result["error"] = f"error: {str(e)}"
        finally:
            if "elapsed_ms" not in result or result["elapsed_ms"] == 0:
                result["elapsed_ms"] = int((time.time() - start_time) * 1000)

        return result

    def add_connectivity_endpoint(self, endpoint: str) -> bool:
        """
        연결성 확인 엔드포인트를 추가합니다.

        Args:
            endpoint: 추가할 엔드포인트 URL

        Returns:
            bool: 추가 성공 여부
        """
        if not endpoint or not isinstance(endpoint, str):
            return False

        if endpoint not in self._connectivity_endpoints:
            self._connectivity_endpoints.append(endpoint)
            logger.info(f"연결성 확인 엔드포인트 추가: {endpoint}")
            return True

        return False

    def remove_connectivity_endpoint(self, endpoint: str) -> bool:
        """
        연결성 확인 엔드포인트를 제거합니다.

        Args:
            endpoint: 제거할 엔드포인트 URL

        Returns:
            bool: 제거 성공 여부
        """
        if endpoint in self._connectivity_endpoints:
            if len(self._connectivity_endpoints) <= 1:
                logger.warning(
                    "최소 하나의 연결성 확인 엔드포인트가 필요합니다. 제거할 수 없습니다."
                )
                return False

            self._connectivity_endpoints.remove(endpoint)
            logger.info(f"연결성 확인 엔드포인트 제거: {endpoint}")
            return True

        return False

    def get_storage_info(self) -> Dict[str, Any]:
        """
        오프라인 스토리지 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 스토리지 정보
        """
        entity_types = []
        pending_entities = []
        total_size = 0
        file_count = 0

        try:
            # 디렉토리 내 파일 탐색
            for file_name in os.listdir(self._storage_dir):
                file_path = os.path.join(self._storage_dir, file_name)

                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    total_size += file_size
                    file_count += 1

                    if (
                        file_name.endswith(".json")
                        and not file_name.endswith("_pending.json")
                        and file_name != "offline_status.json"
                    ):
                        entity_type = file_name.replace(".json", "")
                        entity_types.append(entity_type)
                    elif file_name.endswith("_pending.json"):
                        entity_type = file_name.replace("_pending.json", "")
                        pending_entities.append(entity_type)
        except Exception as e:
            logger.error(f"스토리지 정보 수집 중 오류: {str(e)}")

        return {
            "storage_dir": self._storage_dir,
            "entity_types": sorted(entity_types),
            "pending_entity_types": sorted(pending_entities),
            "total_size_bytes": total_size,
            "total_size_kb": round(total_size / 1024, 2),
            "file_count": file_count,
            "last_check": datetime.now().isoformat(),
        }

    def clear_storage(self, confirm: bool = False) -> Dict[str, Any]:
        """
        오프라인 스토리지의 모든 데이터를 삭제합니다.

        Args:
            confirm: 삭제 확인 플래그, 반드시 True를 전달해야 삭제됨

        Returns:
            Dict[str, Any]: 삭제 결과
        """
        if not confirm:
            return {
                "status": "error",
                "message": "확인되지 않은 삭제 요청입니다. confirm=True를 전달하세요.",
            }

        try:
            deleted_count = 0
            failed_count = 0
            skipped_count = 0

            # 디렉토리 내 파일 삭제
            for file_name in os.listdir(self._storage_dir):
                if file_name == "offline_status.json":
                    skipped_count += 1
                    continue  # 상태 파일은 보존

                file_path = os.path.join(self._storage_dir, file_name)

                if os.path.isfile(file_path):
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                    except Exception as e:
                        logger.error(f"파일 삭제 실패: {file_path} - {str(e)}")
                        failed_count += 1

            # 오프라인 모드 비활성화
            self._offline_mode = False
            self._save_offline_status()

            return {
                "status": "success",
                "deleted_count": deleted_count,
                "failed_count": failed_count,
                "skipped_count": skipped_count,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"스토리지 정리 중 오류: {str(e)}")
            return {"status": "error", "message": str(e)}

    def backup_storage(self, backup_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        오프라인 스토리지를 백업합니다.

        Args:
            backup_dir: 백업 디렉토리 (없으면 기본 위치에 타임스탬프로 생성)

        Returns:
            Dict[str, Any]: 백업 결과
        """
        import shutil

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if not backup_dir:
            # 스토리지 디렉토리의 부모 경로에 backup 디렉토리 생성
            parent_dir = os.path.dirname(os.path.abspath(self._storage_dir))
            backup_dir = os.path.join(parent_dir, f"offline_backup_{timestamp}")

        try:
            # 백업 디렉토리 생성
            os.makedirs(backup_dir, exist_ok=True)

            # 모든 파일 복사
            copied_count = 0
            failed_count = 0

            for file_name in os.listdir(self._storage_dir):
                src_path = os.path.join(self._storage_dir, file_name)
                dst_path = os.path.join(backup_dir, file_name)

                if os.path.isfile(src_path):
                    try:
                        shutil.copy2(src_path, dst_path)
                        copied_count += 1
                    except Exception as e:
                        logger.error(f"파일 백업 실패: {src_path} - {str(e)}")
                        failed_count += 1

            # 메타데이터 파일 생성
            metadata = {
                "backup_timestamp": timestamp,
                "source_dir": self._storage_dir,
                "backup_dir": backup_dir,
                "copied_files": copied_count,
                "failed_files": failed_count,
                "offline_mode": self._offline_mode,
                "network_status": self._network_status,
            }

            with open(
                os.path.join(backup_dir, "backup_metadata.json"), "w", encoding="utf-8"
            ) as f:
                json.dump(
                    metadata, f, ensure_ascii=False, default=self._json_serializer
                )

            return {
                "status": "success",
                "backup_dir": backup_dir,
                "copied_files": copied_count,
                "failed_files": failed_count,
                "timestamp": timestamp,
            }
        except Exception as e:
            logger.error(f"스토리지 백업 중 오류: {str(e)}")
            return {"status": "error", "message": str(e)}

    def restore_backup(self, backup_dir: str, confirm: bool = False) -> Dict[str, Any]:
        """
        백업에서 오프라인 스토리지를 복원합니다.

        Args:
            backup_dir: 백업 디렉토리 경로
            confirm: 복원 확인 플래그, 반드시 True를 전달해야 복원됨

        Returns:
            Dict[str, Any]: 복원 결과
        """
        if not confirm:
            return {
                "status": "error",
                "message": "확인되지 않은 복원 요청입니다. confirm=True를 전달하세요.",
            }

        if not os.path.exists(backup_dir) or not os.path.isdir(backup_dir):
            return {
                "status": "error",
                "message": f"유효한 백업 디렉토리가 아닙니다: {backup_dir}",
            }

        # 메타데이터 확인
        metadata_file = os.path.join(backup_dir, "backup_metadata.json")
        if not os.path.exists(metadata_file):
            return {
                "status": "error",
                "message": "백업 메타데이터 파일이 없습니다. 유효한 백업이 아닐 수 있습니다.",
            }

        import shutil

        try:
            # 현재 스토리지 백업
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            current_backup = f"{self._storage_dir}.bak.{timestamp}"
            shutil.copytree(self._storage_dir, current_backup)

            # 기존 스토리지 비우기
            for file_name in os.listdir(self._storage_dir):
                file_path = os.path.join(self._storage_dir, file_name)
                if os.path.isfile(file_path):
                    os.remove(file_path)

            # 백업에서 복원
            copied_count = 0
            failed_count = 0

            for file_name in os.listdir(backup_dir):
                if file_name == "backup_metadata.json":
                    continue  # 메타데이터 파일 제외

                src_path = os.path.join(backup_dir, file_name)
                dst_path = os.path.join(self._storage_dir, file_name)

                if os.path.isfile(src_path):
                    try:
                        shutil.copy2(src_path, dst_path)
                        copied_count += 1
                    except Exception as e:
                        logger.error(f"파일 복원 실패: {src_path} - {str(e)}")
                        failed_count += 1

            # 상태 다시 로드
            self._load_offline_status()

            return {
                "status": "success",
                "backup_dir": backup_dir,
                "current_backup": current_backup,
                "copied_files": copied_count,
                "failed_files": failed_count,
                "timestamp": timestamp,
            }
        except Exception as e:
            logger.error(f"백업 복원 중 오류: {str(e)}")
            return {"status": "error", "message": str(e)}

    def set_auto_retry_options(self, max_retries: int = 3, retry_delay: int = 5):
        """
        자동 재시도 옵션을 설정합니다.

        Args:
            max_retries: 최대 재시도 횟수
            retry_delay: 재시도 지연 시간(초)
        """
        if not hasattr(self, "_max_retries"):
            self._max_retries = 3

        if not hasattr(self, "_retry_delay"):
            self._retry_delay = 5

        if max_retries >= 0:
            self._max_retries = max_retries

        if retry_delay >= 1:
            self._retry_delay = retry_delay

        logger.info(
            f"자동 재시도 옵션 설정: 최대 {self._max_retries}회, {self._retry_delay}초 간격"
        )

    def get_auto_retry_options(self) -> Dict[str, int]:
        """
        자동 재시도 옵션을 반환합니다.

        Returns:
            Dict[str, int]: 재시도 옵션
        """
        if not hasattr(self, "_max_retries"):
            self._max_retries = 3

        if not hasattr(self, "_retry_delay"):
            self._retry_delay = 5

        return {"max_retries": self._max_retries, "retry_delay": self._retry_delay}

    def set_network_error_handler(
        self, handler: Optional[Callable[[Exception], None]] = None
    ):
        """
        네트워크 오류 발생 시 호출될 핸들러를 설정합니다.

        Args:
            handler: 오류 처리 핸들러 함수
        """
        self._network_error_handler = handler
        logger.info("네트워크 오류 핸들러가 설정되었습니다.")

    def _handle_network_error(self, error: Exception):
        """
        네트워크 오류를 처리합니다.
        등록된 핸들러가 있으면 호출합니다.

        Args:
            error: 발생한 오류
        """
        if hasattr(self, "_network_error_handler") and self._network_error_handler:
            try:
                self._network_error_handler(error)
            except Exception as e:
                logger.error(f"네트워크 오류 핸들러 호출 중 오류: {str(e)}")
        else:
            logger.error(f"네트워크 오류 발생 (핸들러 없음): {str(error)}")

    def get_network_monitor_status(self) -> Dict[str, Any]:
        """
        네트워크 모니터링 상태 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 모니터링 상태 정보
        """
        is_monitoring = (
            self._network_monitor_thread is not None
            and self._network_monitor_thread.is_alive()
            and not getattr(self, "_stop_monitoring", False)
        )

        return {
            "is_active": is_monitoring,
            "thread_alive": self._network_monitor_thread is not None
            and self._network_monitor_thread.is_alive(),
            "stop_requested": getattr(self, "_stop_monitoring", False),
            "check_interval": self._network_check_interval,
            "last_check": (
                self._last_network_check.isoformat()
                if self._last_network_check
                else None
            ),
            "current_status": self._network_status,
            "endpoints": self._connectivity_endpoints,
        }

    def run_async_task(self, task_func: Callable, *args, **kwargs) -> threading.Thread:
        """
        작업을 비동기적으로 실행합니다.

        Args:
            task_func: 실행할 함수
            *args: 함수에 전달할 위치 인자
            **kwargs: 함수에 전달할 키워드 인자

        Returns:
            threading.Thread: 생성된 스레드 객체
        """

        def _task_wrapper():
            task_name = getattr(task_func, "__name__", "unnamed_task")
            task_id = str(uuid.uuid4())[:8]
            logger.info(f"비동기 작업 시작: {task_name} (ID: {task_id})")
            start_time = time.time()

            try:
                result = task_func(*args, **kwargs)
                elapsed = time.time() - start_time
                logger.info(
                    f"비동기 작업 완료: {task_name} (ID: {task_id}, 소요시간: {elapsed:.2f}초)"
                )
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(
                    f"비동기 작업 실패: {task_name} (ID: {task_id}, 소요시간: {elapsed:.2f}초) - {str(e)}"
                )
                if hasattr(self, "_task_error_handler") and self._task_error_handler:
                    try:
                        self._task_error_handler(task_name, task_id, e)
                    except Exception as handler_error:
                        logger.error(
                            f"작업 오류 핸들러 호출 실패: {str(handler_error)}"
                        )

        thread = threading.Thread(target=_task_wrapper, daemon=True)
        thread.start()
        return thread

    def set_task_error_handler(self, handler: Callable[[str, str, Exception], None]):
        """
        비동기 작업 오류 처리 핸들러를 설정합니다.

        Args:
            handler: 오류 처리 핸들러 함수 (task_name, task_id, error를 인자로 받음)
        """
        self._task_error_handler = handler

    def async_backup_storage(
        self,
        backup_dir: Optional[str] = None,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> threading.Thread:
        """
        오프라인 스토리지를 비동기적으로 백업합니다.

        Args:
            backup_dir: 백업 디렉토리 (없으면 기본 위치에 타임스탬프로 생성)
            callback: 백업 완료 후 결과를 받을 콜백 함수

        Returns:
            threading.Thread: 백업 작업 스레드
        """

        def _backup_task():
            result = self.backup_storage(backup_dir)
            if callback:
                try:
                    callback(result)
                except Exception as e:
                    logger.error(f"백업 완료 콜백 호출 실패: {str(e)}")
            return result

        return self.run_async_task(_backup_task)

    def async_restore_backup(
        self,
        backup_dir: str,
        confirm: bool = False,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> threading.Thread:
        """
        백업에서 오프라인 스토리지를 비동기적으로 복원합니다.

        Args:
            backup_dir: 백업 디렉토리 경로
            confirm: 복원 확인 플래그, 반드시 True를 전달해야 복원됨
            callback: 복원 완료 후 결과를 받을 콜백 함수

        Returns:
            threading.Thread: 복원 작업 스레드
        """

        def _restore_task():
            result = self.restore_backup(backup_dir, confirm)
            if callback:
                try:
                    callback(result)
                except Exception as e:
                    logger.error(f"복원 완료 콜백 호출 실패: {str(e)}")
            return result

        return self.run_async_task(_restore_task)

    def async_sync_pending_operations(
        self,
        sync_handlers: Dict[str, Dict[str, callable]] = None,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> threading.Thread:
        """
        모든 보류 중인 오프라인 작업을 비동기적으로 온라인 DB에 동기화합니다.

        Args:
            sync_handlers: 엔티티 타입별 작업 타입별 동기화 핸들러 함수
            callback: 동기화 완료 후 결과를 받을 콜백 함수

        Returns:
            threading.Thread: 동기화 작업 스레드
        """

        def _sync_task():
            result = self.sync_pending_operations(sync_handlers)
            if callback:
                try:
                    callback(result)
                except Exception as e:
                    logger.error(f"동기화 완료 콜백 호출 실패: {str(e)}")
            return result

        return self.run_async_task(_sync_task)

    def compress_storage(self) -> Dict[str, Any]:
        """
        오프라인 스토리지 데이터를 압축하여 저장 공간을 절약합니다.
        이미 존재하는 데이터를 압축하여 _compressed 접미사가 붙은 파일로 저장합니다.

        Returns:
            Dict[str, Any]: 압축 결과
        """
        import gzip
        import json

        compressed_count = 0
        failed_count = 0
        space_saved_bytes = 0

        try:
            for file_name in os.listdir(self._storage_dir):
                if not file_name.endswith(".json") or file_name.endswith(
                    "_compressed.json"
                ):
                    continue

                file_path = os.path.join(self._storage_dir, file_name)
                compressed_path = os.path.join(
                    self._storage_dir, file_name.replace(".json", "_compressed.json")
                )

                if not os.path.isfile(file_path):
                    continue

                try:
                    # 원본 크기 기록
                    original_size = os.path.getsize(file_path)

                    # 파일 읽기
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    # 압축하여 저장
                    json_str = json.dumps(
                        data, ensure_ascii=False, default=self._json_serializer
                    )
                    with gzip.open(
                        compressed_path + ".gz", "wt", encoding="utf-8"
                    ) as f:
                        f.write(json_str)

                    # 압축 후 크기 확인
                    compressed_size = os.path.getsize(compressed_path + ".gz")
                    space_saved = original_size - compressed_size
                    space_saved_bytes += space_saved

                    compressed_count += 1
                    logger.info(
                        f"압축 완료: {file_name} ({space_saved} 바이트 절약, {(space_saved/original_size)*100:.1f}% 감소)"
                    )

                except Exception as e:
                    logger.error(f"파일 압축 실패: {file_path} - {str(e)}")
                    failed_count += 1

            return {
                "status": "success",
                "compressed_count": compressed_count,
                "failed_count": failed_count,
                "space_saved_bytes": space_saved_bytes,
                "space_saved_kb": round(space_saved_bytes / 1024, 2),
            }
        except Exception as e:
            logger.error(f"스토리지 압축 중 오류: {str(e)}")
            return {"status": "error", "message": str(e)}

    # 캐싱 관련 메서드
    def enable_cache(self, enabled: bool = True, ttl: int = 300):
        """
        메모리 캐시 기능을 활성화 또는 비활성화합니다.

        Args:
            enabled: 활성화 여부
            ttl: 캐시 TTL(초)
        """
        old_status = self._cache_enabled
        self._cache_enabled = enabled

        if ttl >= 10:  # 최소 10초 TTL 보장
            self._cache_ttl = ttl

        if old_status != enabled:
            if enabled:
                logger.info(f"메모리 캐시 활성화 (TTL: {self._cache_ttl}초)")
            else:
                logger.info("메모리 캐시 비활성화")
                # 캐시 비우기
                self.clear_cache()

    def set_cache_ttl(self, ttl: int):
        """
        캐시 TTL(Time To Live)을 설정합니다.

        Args:
            ttl: 캐시 유효 시간(초)
        """
        if ttl >= 10:  # 최소 10초 TTL 보장
            self._cache_ttl = ttl
            logger.info(f"캐시 TTL 설정: {ttl}초")

    def clear_cache(self, entity_type: Optional[str] = None):
        """
        메모리 캐시를 비웁니다.

        Args:
            entity_type: 비울 엔티티 타입 (기본값: 모든 엔티티)
        """
        if entity_type:
            if entity_type in self._memory_cache:
                del self._memory_cache[entity_type]
                if entity_type in self._cache_timestamps:
                    del self._cache_timestamps[entity_type]
                logger.info(f"{entity_type} 엔티티 캐시 삭제")
        else:
            self._memory_cache = {}
            self._cache_timestamps = {}
            logger.info("모든 메모리 캐시 삭제")

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 캐시 통계 정보
        """
        cache_size = sum(len(str(data)) for data in self._memory_cache.values())
        try:
            hit_ratio = (
                self._cache_hits / (self._cache_hits + self._cache_misses)
                if (self._cache_hits + self._cache_misses) > 0
                else 0
            )
        except ZeroDivisionError:
            hit_ratio = 0

        return {
            "enabled": self._cache_enabled,
            "ttl": self._cache_ttl,
            "entity_count": len(self._memory_cache),
            "entities": list(self._memory_cache.keys()),
            "cache_size_bytes": cache_size,
            "cache_size_kb": round(cache_size / 1024, 2),
            "hits": self._cache_hits,
            "misses": self._cache_misses,
            "hit_ratio": hit_ratio,
            "timestamps": {
                k: datetime.fromtimestamp(v).isoformat()
                for k, v in self._cache_timestamps.items()
            },
        }

    # 암호화 관련 메서드
    def enable_encryption(self, enabled: bool = True, key: Optional[str] = None):
        """
        데이터 암호화 기능을 활성화 또는 비활성화합니다.

        Args:
            enabled: 활성화 여부
            key: 암호화 키 (기본값: 자동 생성)
        """
        self._encryption_enabled = enabled

        if enabled:
            if key:
                # 키 해싱하여 저장
                self._encryption_key = self._hash_key(key)
            elif not self._encryption_key:
                # 키가 없으면 생성
                self._encryption_key = self._generate_encryption_key()

            logger.info("데이터 암호화 활성화")
        else:
            logger.info("데이터 암호화 비활성화")

    def _hash_key(self, key: str) -> bytes:
        """키를 해싱하여 암호화에 사용할 수 있는 형태로 변환합니다."""
        return hashlib.sha256(key.encode()).digest()

    def _generate_encryption_key(self) -> bytes:
        """새로운 암호화 키를 생성합니다."""
        import os

        return hashlib.sha256(os.urandom(32)).digest()

    def encrypt_data(self, data: Any) -> str:
        """
        데이터를 암호화합니다.

        Args:
            data: 암호화할 데이터

        Returns:
            str: Base64로 인코딩된 암호화 데이터
        """
        if not self._encryption_enabled or not self._encryption_key:
            raise ValueError("암호화가 활성화되지 않았거나 키가 설정되지 않았습니다.")

        try:
            import json

            from cryptography.fernet import Fernet

            # 데이터 직렬화
            serialized = json.dumps(
                data, ensure_ascii=False, default=self._json_serializer
            )

            # Fernet 키 생성 (SHA-256으로 해싱된 키를 base64 인코딩)
            key_base64 = base64.urlsafe_b64encode(self._encryption_key)
            cipher = Fernet(key_base64)

            # 암호화 및 인코딩
            encrypted = cipher.encrypt(serialized.encode("utf-8"))
            return base64.b64encode(encrypted).decode("ascii")

        except ImportError:
            logger.error(
                "cryptography 패키지가 설치되지 않았습니다. pip install cryptography로 설치하세요."
            )
            raise
        except Exception as e:
            logger.error(f"데이터 암호화 중 오류: {str(e)}")
            raise

    def decrypt_data(self, encrypted_data: str) -> Any:
        """
        암호화된 데이터를 복호화합니다.

        Args:
            encrypted_data: Base64로 인코딩된 암호화 데이터

        Returns:
            Any: 복호화된 데이터
        """
        if not self._encryption_enabled or not self._encryption_key:
            raise ValueError("암호화가 활성화되지 않았거나 키가 설정되지 않았습니다.")

        try:
            import json

            from cryptography.fernet import Fernet

            # Fernet 키 생성
            key_base64 = base64.urlsafe_b64encode(self._encryption_key)
            cipher = Fernet(key_base64)

            # 디코딩 및 복호화
            encrypted_bytes = base64.b64decode(encrypted_data)
            decrypted = cipher.decrypt(encrypted_bytes)

            # 역직렬화
            return json.loads(decrypted.decode("utf-8"))

        except ImportError:
            logger.error(
                "cryptography 패키지가 설치되지 않았습니다. pip install cryptography로 설치하세요."
            )
            raise
        except Exception as e:
            logger.error(f"데이터 복호화 중 오류: {str(e)}")
            raise

    def save_encrypted_data(self, entity_type: str, data: Any) -> bool:
        """
        데이터를 암호화하여 저장합니다.

        Args:
            entity_type: 엔티티 타입
            data: 저장할 데이터

        Returns:
            bool: 성공 여부
        """
        if not self._encryption_enabled:
            logger.warning(
                "암호화가 활성화되지 않았습니다. 일반 저장 방식을 사용하세요."
            )
            return False

        try:
            encrypted = self.encrypt_data(data)
            file_path = os.path.join(self._storage_dir, f"{entity_type}_encrypted.dat")

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(encrypted)

            logger.info(f"{entity_type} 데이터 암호화 저장 완료")
            return True

        except Exception as e:
            logger.error(f"암호화 데이터 저장 실패: {str(e)}")
            return False

    def load_encrypted_data(self, entity_type: str) -> Any:
        """
        암호화된 데이터를 로드하여 복호화합니다.

        Args:
            entity_type: 엔티티 타입

        Returns:
            Any: 복호화된 데이터
        """
        if not self._encryption_enabled:
            logger.warning("암호화가 활성화되지 않았습니다.")
            return None

        file_path = os.path.join(self._storage_dir, f"{entity_type}_encrypted.dat")

        if not os.path.exists(file_path):
            logger.warning(f"{entity_type} 암호화 데이터 파일이 없습니다.")
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                encrypted = f.read()

            data = self.decrypt_data(encrypted)
            logger.info(f"{entity_type} 암호화 데이터 로드 및 복호화 완료")
            return data

        except Exception as e:
            logger.error(f"암호화 데이터 로드 실패: {str(e)}")
            return None

    # 성능 모니터링 관련 메서드
    def enable_performance_metrics(self, enabled: bool = True):
        """
        성능 지표 수집을 활성화 또는 비활성화합니다.

        Args:
            enabled: 활성화 여부
        """
        old_status = self._metrics_enabled
        self._metrics_enabled = enabled

        if old_status != enabled:
            if enabled:
                logger.info("성능 지표 수집 활성화")
            else:
                logger.info("성능 지표 수집 비활성화")
                # 지표 초기화
                self.clear_performance_metrics()

    def clear_performance_metrics(self):
        """성능 지표를 초기화합니다."""
        self._performance_metrics = {
            "operations": {},
            "network_checks": [],
            "sync_operations": [],
        }
        logger.info("성능 지표 초기화 완료")

    def record_operation_time(self, operation_name: str, elapsed_time: float):
        """
        작업 수행 시간을 기록합니다.

        Args:
            operation_name: 작업 이름
            elapsed_time: 소요 시간(초)
        """
        if not self._metrics_enabled:
            return

        if operation_name not in self._performance_metrics["operations"]:
            self._performance_metrics["operations"][operation_name] = {
                "count": 0,
                "total_time": 0,
                "min_time": float("inf"),
                "max_time": 0,
                "last_time": 0,
            }

        metrics = self._performance_metrics["operations"][operation_name]
        metrics["count"] += 1
        metrics["total_time"] += elapsed_time
        metrics["min_time"] = min(metrics["min_time"], elapsed_time)
        metrics["max_time"] = max(metrics["max_time"], elapsed_time)
        metrics["last_time"] = elapsed_time

    def record_network_check(self, status: NetworkStatus, elapsed_time: float):
        """
        네트워크 확인 결과를 기록합니다.

        Args:
            status: 네트워크 상태
            elapsed_time: 확인 소요 시간(초)
        """
        if not self._metrics_enabled:
            return

        self._performance_metrics["network_checks"].append(
            {
                "timestamp": datetime.now().isoformat(),
                "status": status,
                "elapsed_time": elapsed_time,
            }
        )

        # 최대 100개 항목만 유지
        if len(self._performance_metrics["network_checks"]) > 100:
            self._performance_metrics["network_checks"] = self._performance_metrics[
                "network_checks"
            ][-100:]

    def record_sync_operation(
        self,
        entity_type: str,
        operation_type: str,
        result: str,
        elapsed_time: float,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        동기화 작업 결과를 기록합니다.

        Args:
            entity_type: 엔티티 타입
            operation_type: 작업 타입
            result: 결과 (success/failed)
            elapsed_time: 소요 시간(초)
            details: 추가 세부 정보
        """
        if not self._metrics_enabled:
            return

        self._performance_metrics["sync_operations"].append(
            {
                "timestamp": datetime.now().isoformat(),
                "entity_type": entity_type,
                "operation_type": operation_type,
                "result": result,
                "elapsed_time": elapsed_time,
                "details": details or {},
            }
        )

        # 최대 500개 항목만 유지
        if len(self._performance_metrics["sync_operations"]) > 500:
            self._performance_metrics["sync_operations"] = self._performance_metrics[
                "sync_operations"
            ][-500:]

    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        수집된 성능 지표를 반환합니다.

        Returns:
            Dict[str, Any]: 성능 지표
        """
        # 메트릭 계산
        avg_operation_times = {}
        for op_name, metrics in self._performance_metrics["operations"].items():
            if metrics["count"] > 0:
                avg_operation_times[op_name] = metrics["total_time"] / metrics["count"]

        # 네트워크 확인 성공률
        network_checks = self._performance_metrics["network_checks"]
        total_checks = len(network_checks)
        success_checks = sum(
            1 for check in network_checks if check["status"] == NetworkStatus.ONLINE
        )
        success_rate = success_checks / total_checks if total_checks > 0 else 0

        # 동기화 성공률
        sync_ops = self._performance_metrics["sync_operations"]
        total_syncs = len(sync_ops)
        success_syncs = sum(1 for op in sync_ops if op["result"] == "success")
        sync_success_rate = success_syncs / total_syncs if total_syncs > 0 else 0

        return {
            "enabled": self._metrics_enabled,
            "operations": {
                "counts": {
                    op: metrics["count"]
                    for op, metrics in self._performance_metrics["operations"].items()
                },
                "avg_times": avg_operation_times,
                "min_times": {
                    op: (
                        metrics["min_time"]
                        if metrics["min_time"] != float("inf")
                        else 0
                    )
                    for op, metrics in self._performance_metrics["operations"].items()
                },
                "max_times": {
                    op: metrics["max_time"]
                    for op, metrics in self._performance_metrics["operations"].items()
                },
            },
            "network": {
                "total_checks": total_checks,
                "success_rate": success_rate,
                "last_10_checks": network_checks[-10:] if network_checks else [],
            },
            "sync": {
                "total_operations": total_syncs,
                "success_rate": sync_success_rate,
                "avg_time": (
                    sum(op["elapsed_time"] for op in sync_ops) / total_syncs
                    if total_syncs > 0
                    else 0
                ),
                "last_10_operations": sync_ops[-10:] if sync_ops else [],
            },
        }

    # 성능 모니터링 데코레이터
    def measure_performance(self, operation_name: str = None):
        """
        메서드의 실행 시간을 측정하는 데코레이터

        Args:
            operation_name: 작업 이름 (없으면 메서드 이름 사용)
        """

        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                if not self._metrics_enabled:
                    return func(*args, **kwargs)

                op_name = operation_name or func.__name__
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    elapsed = time.time() - start_time
                    self.record_operation_time(op_name, elapsed)
                    return result
                except Exception as e:
                    elapsed = time.time() - start_time
                    self.record_operation_time(f"{op_name}_error", elapsed)
                    raise

            return wrapper

        return decorator

    # 충돌 해결 전략 관련 메서드
    def set_conflict_strategy(self, strategy: str):
        """
        충돌 해결 전략을 설정합니다.

        Args:
            strategy: 충돌 해결 전략
                - "server_wins": 서버 데이터 우선 (기본값)
                - "client_wins": 클라이언트 데이터 우선
                - "newest_wins": 최신 타임스탬프 우선
                - "manual": 수동 해결
        """
        valid_strategies = [
            self.CONFLICT_STRATEGY_SERVER_WINS,
            self.CONFLICT_STRATEGY_CLIENT_WINS,
            self.CONFLICT_STRATEGY_NEWEST_WINS,
            self.CONFLICT_STRATEGY_MANUAL,
        ]

        if strategy not in valid_strategies:
            raise ValueError(
                f"유효하지 않은 충돌 해결 전략입니다. 유효한 값: {', '.join(valid_strategies)}"
            )

        self._conflict_strategy = strategy
        logger.info(f"충돌 해결 전략 설정: {strategy}")

    def get_conflict_strategy(self) -> str:
        """
        현재 충돌 해결 전략을 반환합니다.

        Returns:
            str: 충돌 해결 전략
        """
        return self._conflict_strategy

    def set_conflict_resolution_handler(
        self, handler: Callable[[Dict[str, Any], Dict[str, Any]], Dict[str, Any]]
    ):
        """
        수동 충돌 해결 핸들러를 설정합니다. (manual 전략에서 사용)

        Args:
            handler: 충돌 해결 핸들러 함수 (서버 데이터, 클라이언트 데이터를 인자로 받아 합쳐진 데이터 반환)
        """
        self._conflict_resolution_handler = handler
        logger.info("수동 충돌 해결 핸들러 설정됨")

    def resolve_conflict(
        self,
        server_data: Dict[str, Any],
        client_data: Dict[str, Any],
        server_timestamp: Optional[float] = None,
        client_timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        데이터 충돌을 현재 전략에 따라 해결합니다.

        Args:
            server_data: 서버 데이터
            client_data: 클라이언트 데이터
            server_timestamp: 서버 데이터 타임스탬프 (newest_wins 전략에서 사용)
            client_timestamp: 클라이언트 데이터 타임스탬프 (newest_wins 전략에서 사용)

        Returns:
            Dict[str, Any]: 해결된 데이터
        """
        if self._conflict_strategy == self.CONFLICT_STRATEGY_SERVER_WINS:
            return server_data

        elif self._conflict_strategy == self.CONFLICT_STRATEGY_CLIENT_WINS:
            return client_data

        elif self._conflict_strategy == self.CONFLICT_STRATEGY_NEWEST_WINS:
            if server_timestamp is None or client_timestamp is None:
                logger.warning(
                    "타임스탬프가 없어 newest_wins 전략을 적용할 수 없습니다. server_wins를 사용합니다."
                )
                return server_data

            return client_data if client_timestamp > server_timestamp else server_data

        elif self._conflict_strategy == self.CONFLICT_STRATEGY_MANUAL:
            if self._conflict_resolution_handler is None:
                logger.warning(
                    "수동 충돌 해결 핸들러가 설정되지 않았습니다. server_wins를 사용합니다."
                )
                return server_data

            try:
                return self._conflict_resolution_handler(server_data, client_data)
            except Exception as e:
                logger.error(f"수동 충돌 해결 중 오류: {str(e)}")
                return server_data

        # 기본값은 서버 데이터
        return server_data

    def detect_conflicts(
        self, entity_type: str, remote_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        로컬 데이터와 원격 데이터 간의 충돌을 감지합니다.

        Args:
            entity_type: 엔티티 타입
            remote_data: 원격 데이터

        Returns:
            Dict[str, Any]: 충돌 감지 결과
        """
        local_data = self.get_offline_data(entity_type)

        # ID 필드 결정 (대부분의 경우 "id"이지만, 엔티티 타입별로 다를 수 있음)
        id_field = "id"

        # ID를 키로 하는 딕셔너리 생성
        local_map = {
            item.get(id_field): item for item in local_data if id_field in item
        }
        remote_map = {
            item.get(id_field): item for item in remote_data if id_field in item
        }

        # 충돌 항목 찾기
        conflicts = []
        for item_id, remote_item in remote_map.items():
            if item_id in local_map:
                local_item = local_map[item_id]

                # 단순 검사: 로컬 항목이 원격 항목과 다르면 충돌로 간주
                # 실제 애플리케이션에서는 더 정교한 비교 로직 사용 가능
                if local_item != remote_item:
                    conflicts.append(
                        {
                            "id": item_id,
                            "local_item": local_item,
                            "remote_item": remote_item,
                        }
                    )

        # 원격에는 없지만 로컬에 있는 항목 (로컬에서 추가됨)
        local_only = [item_id for item_id in local_map if item_id not in remote_map]

        # 로컬에는 없지만 원격에 있는 항목 (원격에서 추가됨)
        remote_only = [item_id for item_id in remote_map if item_id not in local_map]

        return {
            "entity_type": entity_type,
            "total_local": len(local_data),
            "total_remote": len(remote_data),
            "conflicts": conflicts,
            "conflict_count": len(conflicts),
            "local_only": local_only,
            "local_only_count": len(local_only),
            "remote_only": remote_only,
            "remote_only_count": len(remote_only),
        }

    def sync_with_conflict_resolution(
        self, entity_type: str, remote_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        충돌 해결 전략을 사용하여 로컬 데이터와 원격 데이터를 동기화합니다.

        Args:
            entity_type: 엔티티 타입
            remote_data: 원격 데이터

        Returns:
            Dict[str, Any]: 동기화 결과
        """
        start_time = time.time()

        # 충돌 감지
        conflict_result = self.detect_conflicts(entity_type, remote_data)

        if (
            conflict_result["conflict_count"] == 0
            and conflict_result["local_only_count"] == 0
        ):
            # 충돌 없이 원격 데이터만 있는 경우 간단히 동기화
            self.sync_to_offline(entity_type, remote_data)

            elapsed = time.time() - start_time
            if self._metrics_enabled:
                self.record_sync_operation(
                    entity_type, "sync_no_conflict", "success", elapsed
                )

            return {
                "status": "success",
                "message": "충돌 없이 동기화 완료",
                "entity_type": entity_type,
                "elapsed_time": elapsed,
            }

        # 충돌이 있는 경우 해결 필요
        local_data = self.get_offline_data(entity_type)
        id_field = "id"  # ID 필드명

        # ID를 키로 하는 딕셔너리 생성
        local_map = {
            item.get(id_field): item for item in local_data if id_field in item
        }
        remote_map = {
            item.get(id_field): item for item in remote_data if id_field in item
        }

        # 충돌 해결
        resolved_items = []

        # 원격 데이터 기반으로 순회
        for item_id, remote_item in remote_map.items():
            if item_id in local_map:
                local_item = local_map[item_id]

                # 항목이 동일하면 그대로 사용
                if local_item == remote_item:
                    resolved_items.append(remote_item)
                    continue

                # 충돌이 있는 경우 전략에 따라 해결
                resolved_item = self.resolve_conflict(
                    remote_item,
                    local_item,
                    remote_item.get("updated_at"),
                    local_item.get("updated_at"),
                )
                resolved_items.append(resolved_item)
            else:
                # 로컬에 없는 원격 항목은 그대로 추가
                resolved_items.append(remote_item)

        # 로컬에만 있는 항목 처리
        for item_id in conflict_result["local_only"]:
            # 클라이언트 우선 전략이거나 수동 해결인 경우만 로컬 항목 유지
            if self._conflict_strategy in [
                self.CONFLICT_STRATEGY_CLIENT_WINS,
                self.CONFLICT_STRATEGY_MANUAL,
            ]:
                resolved_items.append(local_map[item_id])

        # 해결된 데이터 저장
        self.sync_to_offline(entity_type, resolved_items)

        elapsed = time.time() - start_time
        if self._metrics_enabled:
            self.record_sync_operation(
                entity_type,
                "sync_with_conflict",
                "success",
                elapsed,
                {
                    "conflicts_resolved": conflict_result["conflict_count"],
                    "local_only_kept": sum(
                        1
                        for item_id in conflict_result["local_only"]
                        if self._conflict_strategy
                        in [
                            self.CONFLICT_STRATEGY_CLIENT_WINS,
                            self.CONFLICT_STRATEGY_MANUAL,
                        ]
                    ),
                },
            )

        return {
            "status": "success",
            "message": "충돌 해결 후 동기화 완료",
            "entity_type": entity_type,
            "conflicts_resolved": conflict_result["conflict_count"],
            "strategy_used": self._conflict_strategy,
            "elapsed_time": elapsed,
        }

    # 단위 테스트를 위한 유틸리티 메서드
    def reset_for_testing(self):
        """
        단위 테스트를 위해 상태를 리셋합니다.

        주의: 실제 운영 환경에서는 사용하지 마세요!
        """
        self._init_basic_config(self._storage_dir)
        self._init_threading_config()
        self._init_error_handling_config()
        self._init_listeners()
        self._init_performance_monitoring()
        self._init_encryption()
        self._init_caching()
        self._init_conflict_resolution()

        # 네트워크 모니터링 중지
        if self._network_monitor_thread and self._network_monitor_thread.is_alive():
            self.stop_network_monitoring()

        logger.info("테스트를 위한 상태 초기화 완료")

    def mock_network_status(self, status: NetworkStatus):
        """
        테스트를 위해 네트워크 상태를 모의 설정합니다.

        Args:
            status: 설정할 네트워크 상태
        """
        old_status = self._network_status
        self._network_status = status

        # 상태 변경 시 리스너 호출
        if old_status != status:
            self._notify_network_status_listeners()

        logger.info(f"테스트를 위해 네트워크 상태 모의 설정: {status}")

    def simulate_network_reconnection(self):
        """테스트를 위해 네트워크 재연결을 시뮬레이션합니다."""
        self.mock_network_status(NetworkStatus.OFFLINE)
        time.sleep(0.1)
        self.mock_network_status(NetworkStatus.ONLINE)

        # 연결 복구 시 동기화 기회 알림
        if (
            self._offline_mode
            and self._auto_sync_enabled
            and self.has_pending_operations()
        ):
            self._notify_sync_opportunity()

        logger.info("네트워크 재연결 시뮬레이션 완료")

    # 로그 레벨 설정 메서드
    def set_log_level(self, level: int):
        """
        오프라인 관리자의 로그 레벨을 설정합니다.

        Args:
            level: 로그 레벨 (logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR 중 하나)
        """
        logger.setLevel(level)
        logger.info(f"로그 레벨 설정: {level}")

    # 성능 개선 - 지연 로드(Lazy Loading) 구현
    def get_entity_lazy(
        self, entity_type: str, entity_id: str, load_func: Optional[Callable] = None
    ) -> Optional[Dict[str, Any]]:
        """
        엔티티를 지연 로드 방식으로 가져옵니다.
        캐시에 없는 경우에만 전체 목록을 로드합니다.

        Args:
            entity_type: 엔티티 타입
            entity_id: 엔티티 ID
            load_func: 캐시 미스 시 호출할 커스텀 로드 함수 (선택적)

        Returns:
            Optional[Dict[str, Any]]: 엔티티 정보 (없으면 None)
        """
        cache_key = f"{entity_type}_entity_{entity_id}"

        # 캐시 확인
        if self._cache_enabled and cache_key in self._memory_cache:
            cache_time = self._cache_timestamps.get(cache_key, 0)
            if (time.time() - cache_time) < self._cache_ttl:
                self._cache_hits += 1
                logger.debug(f"엔티티 캐시 적중: {entity_type}/{entity_id}")
                return self._memory_cache[cache_key]

        # 캐시 미스
        self._cache_misses += 1

        # 커스텀 로드 함수가 있으면 사용
        if load_func:
            entity = load_func(entity_type, entity_id)
        else:
            # 일반적인 방법으로 로드
            entities = self.get_offline_data(entity_type)
            entity = next((e for e in entities if e.get("id") == entity_id), None)

        # 캐시 갱신
        if self._cache_enabled and entity:
            self._memory_cache[cache_key] = entity
            self._cache_timestamps[cache_key] = time.time()

        return entity

    # 진단 및 디버깅 메서드
    def get_diagnostics(self) -> Dict[str, Any]:
        """
        오프라인 관리자의 전체 진단 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 진단 정보
        """
        storage_info = self.get_storage_info()
        monitor_status = self.get_network_monitor_status()
        sync_status = self.get_sync_status()

        if self._metrics_enabled:
            performance_metrics = self.get_performance_metrics()
        else:
            performance_metrics = {"enabled": False}

        if self._cache_enabled:
            cache_stats = self.get_cache_stats()
        else:
            cache_stats = {"enabled": False}

        return {
            "version": "1.0.0",  # 버전 정보 추가
            "timestamp": datetime.now().isoformat(),
            "network": {
                "status": self._network_status,
                "monitoring": monitor_status,
                "endpoints": self._connectivity_endpoints,
                "last_check": (
                    self._last_network_check.isoformat()
                    if self._last_network_check
                    else None
                ),
            },
            "offline_mode": {
                "active": self._offline_mode,
                "auto_sync": self._auto_sync_enabled,
                "sync_status": sync_status,
            },
            "storage": storage_info,
            "performance": performance_metrics,
            "caching": cache_stats,
            "encryption": {"enabled": self._encryption_enabled},
            "conflict_resolution": {
                "strategy": self._conflict_strategy,
                "has_manual_handler": self._conflict_resolution_handler is not None,
            },
            "error_handling": {
                "max_retries": self._max_retries,
                "retry_delay": self._retry_delay,
                "has_network_error_handler": self._network_error_handler is not None,
                "has_task_error_handler": hasattr(self, "_task_error_handler")
                and self._task_error_handler is not None,
            },
            "thread_info": {
                "network_monitor_alive": self._network_monitor_thread is not None
                and self._network_monitor_thread.is_alive(),
                "stop_requested": getattr(self, "_stop_monitoring", False),
            },
        }

    # API 설명서 생성 메서드
    def generate_api_docs(self) -> Dict[str, Any]:
        """
        오프라인 관리자의 API 설명서를 생성합니다.

        Returns:
            Dict[str, Any]: API 문서
        """
        docs = {}

        # 공개 메서드만 찾기
        for name, method in inspect.getmembers(self, inspect.ismethod):
            if not name.startswith("_"):  # 언더스코어로 시작하지 않는 메서드만
                doc = inspect.getdoc(method)
                signature = str(inspect.signature(method))

                docs[name] = {"signature": signature, "doc": doc}

        return {
            "class": "OfflineManager",
            "description": inspect.getdoc(self.__class__),
            "methods": docs,
        }

    # 요약 통계 메서드
    def get_summary_stats(self) -> Dict[str, Any]:
        """
        오프라인 관리자의 요약 통계를 반환합니다.

        Returns:
            Dict[str, Any]: 요약 통계
        """
        entity_types = self._get_all_entity_types()
        entity_counts = {}
        pending_counts = {}
        total_entities = 0
        total_pending = 0

        for entity_type in entity_types:
            # 엔티티 수 계산
            entities = self.get_offline_data(entity_type)
            entity_counts[entity_type] = len(entities)
            total_entities += len(entities)

            # 대기 중인 작업 수 계산
            ops = self.get_pending_operations(entity_type)
            pending_ops = [op for op in ops if op["status"] == "pending"]
            pending_counts[entity_type] = len(pending_ops)
            total_pending += len(pending_ops)

        return {
            "total_entity_types": len(entity_types),
            "total_entities": total_entities,
            "total_pending_operations": total_pending,
            "entity_counts": entity_counts,
            "pending_counts": pending_counts,
            "network_status": self._network_status,
            "offline_mode": self._offline_mode,
            "timestamp": datetime.now().isoformat(),
        }

    # 향상된 로깅 기능
    def setup_file_logging(
        self,
        log_file: str = None,
        max_bytes: int = 5 * 1024 * 1024,
        backup_count: int = 3,
    ):
        """
        파일 로깅을 설정합니다.

        Args:
            log_file: 로그 파일 경로 (기본값: ./offline_manager.log)
            max_bytes: 로그 파일 최대 크기
            backup_count: 최대 백업 파일 수
        """
        if log_file is None:
            log_file = os.path.join(self._storage_dir, "offline_manager.log")

        # 파일 핸들러 설정
        import logging
        from logging.handlers import RotatingFileHandler

        # 루트 로거에서 핸들러 가져오기
        root_logger = logging.getLogger("offline_manager")

        # 기존 FileHandler 제거
        for handler in list(root_logger.handlers):
            if isinstance(handler, logging.FileHandler) or isinstance(
                handler, RotatingFileHandler
            ):
                root_logger.removeHandler(handler)

        # 새 핸들러 설정
        file_handler = RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
        )

        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] [%(module)s] %(message)s"
        )
        file_handler.setFormatter(formatter)

        root_logger.addHandler(file_handler)
        logger.info(f"파일 로깅 설정 완료: {log_file}")

    def get_log_file_path(self) -> Optional[str]:
        """
        현재 로그 파일 경로를 반환합니다.

        Returns:
            Optional[str]: 로그 파일 경로 (설정되지 않았으면 None)
        """
        import logging
        from logging.handlers import RotatingFileHandler

        root_logger = logging.getLogger("offline_manager")

        for handler in root_logger.handlers:
            if isinstance(handler, logging.FileHandler) or isinstance(
                handler, RotatingFileHandler
            ):
                return handler.baseFilename

        return None

    def get_last_logs(self, n_lines: int = 100) -> List[str]:
        """
        마지막 로그 n줄을 가져옵니다.

        Args:
            n_lines: 가져올 로그 줄 수

        Returns:
            List[str]: 마지막 로그 목록
        """
        log_file = self.get_log_file_path()

        if not log_file or not os.path.exists(log_file):
            return ["로그 파일이 설정되지 않았거나 존재하지 않습니다."]

        try:
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
                return lines[-n_lines:] if len(lines) > n_lines else lines
        except Exception as e:
            logger.error(f"로그 파일 읽기 실패: {str(e)}")
            return [f"로그 파일 읽기 실패: {str(e)}"]

    # 고급 모니터링 기능
    def get_advanced_performance_metrics(self) -> Dict[str, Any]:
        """
        고급 성능 지표를 반환합니다.

        Returns:
            Dict[str, Any]: 고급 성능 지표
        """
        if not self._metrics_enabled:
            return {
                "enabled": False,
                "message": "성능 지표 수집이 활성화되지 않았습니다.",
            }

        # 기본 지표 가져오기
        metrics = self.get_performance_metrics()

        # 시스템 정보 추가
        import platform

        import psutil

        try:
            system_metrics = {
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "memory_usage": psutil.Process().memory_info().rss
                / (1024 * 1024),  # MB
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "thread_count": threading.active_count(),
                "timestamp": datetime.now().isoformat(),
            }

            # 디스크 사용량
            if os.path.exists(self._storage_dir):
                storage_usage = shutil.disk_usage(self._storage_dir)
                system_metrics["disk"] = {
                    "total_gb": storage_usage.total / (1024**3),
                    "used_gb": storage_usage.used / (1024**3),
                    "free_gb": storage_usage.free / (1024**3),
                    "percent_used": (storage_usage.used / storage_usage.total) * 100,
                }

            metrics["system"] = system_metrics
        except ImportError:
            metrics["system"] = {
                "error": "psutil 라이브러리가 설치되지 않았습니다. pip install psutil로 설치하세요."
            }
        except Exception as e:
            metrics["system"] = {"error": f"시스템 지표 수집 중 오류: {str(e)}"}

        return metrics

    def start_performance_monitoring(
        self, interval: int = 60, callback: Callable[[Dict[str, Any]], None] = None
    ):
        """
        주기적인 성능 모니터링을 시작합니다.

        Args:
            interval: 모니터링 간격 (초)
            callback: 성능 지표를 받을 콜백 함수

        Returns:
            threading.Thread: 모니터링 스레드
        """
        if not self._metrics_enabled:
            self.enable_performance_metrics(True)

        def _monitoring_task():
            logger.info(f"성능 모니터링 시작 (간격: {interval}초)")

            while not getattr(self, "_stop_performance_monitoring", False):
                try:
                    metrics = self.get_advanced_performance_metrics()

                    if callback:
                        try:
                            callback(metrics)
                        except Exception as e:
                            logger.error(f"성능 지표 콜백 호출 실패: {str(e)}")

                    # 설정된 간격만큼 대기
                    for _ in range(interval):
                        if getattr(self, "_stop_performance_monitoring", False):
                            break
                        time.sleep(1)

                except Exception as e:
                    logger.error(f"성능 모니터링 중 오류: {str(e)}")
                    time.sleep(10)

            logger.info("성능 모니터링 중지")

        # 모니터링 중지 플래그 초기화
        self._stop_performance_monitoring = False

        # 모니터링 스레드 시작
        return self.run_async_task(_monitoring_task)

    def stop_performance_monitoring(self):
        """성능 모니터링을 중지합니다."""
        self._stop_performance_monitoring = True
        logger.info("성능 모니터링 중지 요청")

    # 데이터 내보내기/가져오기 기능
    def export_data(
        self, export_dir: Optional[str] = None, include_pending: bool = True
    ) -> Dict[str, Any]:
        """
        오프라인 데이터를 내보냅니다.

        Args:
            export_dir: 내보낼 디렉토리 (기본값: 자동 생성)
            include_pending: 대기 중인 작업도 포함할지 여부

        Returns:
            Dict[str, Any]: 내보내기 결과
        """
        import shutil

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if not export_dir:
            # 스토리지 디렉토리의 부모 경로에 export 디렉토리 생성
            parent_dir = os.path.dirname(os.path.abspath(self._storage_dir))
            export_dir = os.path.join(parent_dir, f"offline_export_{timestamp}")

        try:
            # 내보내기 디렉토리 생성
            os.makedirs(export_dir, exist_ok=True)

            # 엔티티 타입 목록 가져오기
            entity_types = []
            pending_types = []

            for file_name in os.listdir(self._storage_dir):
                if (
                    file_name.endswith(".json")
                    and not file_name.endswith("_pending.json")
                    and file_name != "offline_status.json"
                ):
                    entity_type = file_name.replace(".json", "")
                    entity_types.append(entity_type)
                elif file_name.endswith("_pending.json"):
                    entity_type = file_name.replace("_pending.json", "")
                    pending_types.append(entity_type)

            # 데이터 내보내기
            exported_entities = {}

            for entity_type in entity_types:
                entities = self.get_offline_data(entity_type)
                exported_entities[entity_type] = entities

                # 파일로 저장
                with open(
                    os.path.join(export_dir, f"{entity_type}.json"),
                    "w",
                    encoding="utf-8",
                ) as f:
                    json.dump(
                        entities, f, ensure_ascii=False, default=self._json_serializer
                    )

            # 대기 중인 작업 내보내기
            if include_pending:
                exported_pending = {}

                for entity_type in pending_types:
                    pending_ops = self.get_pending_operations(entity_type)
                    exported_pending[entity_type] = pending_ops

                    # 파일로 저장
                    with open(
                        os.path.join(export_dir, f"{entity_type}_pending.json"),
                        "w",
                        encoding="utf-8",
                    ) as f:
                        json.dump(
                            pending_ops,
                            f,
                            ensure_ascii=False,
                            default=self._json_serializer,
                        )

            # 메타데이터 생성
            metadata = {
                "export_timestamp": timestamp,
                "source_dir": self._storage_dir,
                "export_dir": export_dir,
                "entity_types": entity_types,
                "pending_types": pending_types if include_pending else [],
                "include_pending": include_pending,
                "total_entities": sum(
                    len(entities) for entities in exported_entities.values()
                ),
                "total_pending": (
                    sum(len(ops) for ops in exported_pending.values())
                    if include_pending
                    else 0
                ),
            }

            # 메타데이터 저장
            with open(
                os.path.join(export_dir, "export_metadata.json"), "w", encoding="utf-8"
            ) as f:
                json.dump(
                    metadata, f, ensure_ascii=False, default=self._json_serializer
                )

            return {"status": "success", "export_dir": export_dir, "metadata": metadata}
        except Exception as e:
            logger.error(f"데이터 내보내기 실패: {str(e)}")
            return {"status": "error", "message": str(e)}

    def import_data(self, import_dir: str, overwrite: bool = False) -> Dict[str, Any]:
        """
        내보낸 오프라인 데이터를 가져옵니다.

        Args:
            import_dir: 가져올 디렉토리
            overwrite: 기존 데이터 덮어쓰기 여부

        Returns:
            Dict[str, Any]: 가져오기 결과
        """
        if not os.path.exists(import_dir) or not os.path.isdir(import_dir):
            return {
                "status": "error",
                "message": f"가져오기 디렉토리가 존재하지 않습니다: {import_dir}",
            }

        # 메타데이터 확인
        metadata_file = os.path.join(import_dir, "export_metadata.json")
        if not os.path.exists(metadata_file):
            return {
                "status": "error",
                "message": "메타데이터 파일이 없습니다. 유효한 내보내기가 아닙니다.",
            }

        try:
            # 메타데이터 로드
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)

            # 백업 생성 (덮어쓰기 모드에서만)
            if overwrite:
                backup_result = self.backup_storage()
                if backup_result["status"] != "success":
                    return {
                        "status": "error",
                        "message": "현재 스토리지 백업 실패로 가져오기가 중단되었습니다.",
                    }

                backup_dir = backup_result["backup_dir"]

            # 엔티티 데이터 가져오기
            imported_entities = {}

            for entity_type in metadata["entity_types"]:
                entity_file = os.path.join(import_dir, f"{entity_type}.json")

                if os.path.exists(entity_file):
                    with open(entity_file, "r", encoding="utf-8") as f:
                        entities = json.load(f)

                    if overwrite or entity_type not in self._get_all_entity_types():
                        # 데이터 저장
                        self.sync_to_offline(entity_type, entities)
                        imported_entities[entity_type] = len(entities)

            # 대기 중인 작업 가져오기
            imported_pending = {}

            if metadata.get("include_pending", False):
                for entity_type in metadata.get("pending_types", []):
                    pending_file = os.path.join(
                        import_dir, f"{entity_type}_pending.json"
                    )

                    if os.path.exists(pending_file):
                        with open(pending_file, "r", encoding="utf-8") as f:
                            pending_ops = json.load(f)

                        if overwrite:
                            # 기존 파일 제거
                            pending_path = self._store._get_pending_ops_file_path(
                                entity_type
                            )
                            if os.path.exists(pending_path):
                                os.remove(pending_path)

                            # 대기 중인 작업 저장
                            with open(pending_path, "w", encoding="utf-8") as f:
                                json.dump(
                                    pending_ops,
                                    f,
                                    ensure_ascii=False,
                                    default=self._json_serializer,
                                )

                            imported_pending[entity_type] = len(pending_ops)

            # 캐시 초기화
            if self._cache_enabled:
                self.clear_cache()

            return {
                "status": "success",
                "import_dir": import_dir,
                "backup_dir": backup_dir if overwrite else None,
                "imported_entities": imported_entities,
                "imported_pending": imported_pending,
                "total_entities": sum(imported_entities.values()),
                "total_pending": sum(imported_pending.values()),
                "overwrite": overwrite,
            }
        except Exception as e:
            logger.error(f"데이터 가져오기 실패: {str(e)}")
            return {"status": "error", "message": str(e)}

    # 데이터 마이그레이션 및 버전 관리

    VERSION = "1.0.0"  # 오프라인 관리자 버전

    def get_version(self) -> str:
        """
        현재 오프라인 관리자 버전을 반환합니다.

        Returns:
            str: 버전 문자열
        """
        return self.VERSION

    def get_storage_version(self) -> Optional[str]:
        """
        저장소의 버전 정보를 반환합니다.

        Returns:
            Optional[str]: 저장소 버전 (설정되지 않았으면 None)
        """
        version_file = os.path.join(self._storage_dir, "version.json")

        if not os.path.exists(version_file):
            return None

        try:
            with open(version_file, "r", encoding="utf-8") as f:
                version_data = json.load(f)
                return version_data.get("version")
        except Exception as e:
            logger.error(f"버전 정보 로드 실패: {str(e)}")
            return None

    def set_storage_version(self, version: str = None):
        """
        저장소의 버전 정보를 설정합니다.

        Args:
            version: 설정할 버전 (기본값: 현재 오프라인 관리자 버전)
        """
        if version is None:
            version = self.VERSION

        version_file = os.path.join(self._storage_dir, "version.json")

        try:
            version_data = {
                "version": version,
                "updated_at": datetime.now().isoformat(),
            }

            with open(version_file, "w", encoding="utf-8") as f:
                json.dump(version_data, f, ensure_ascii=False)

            logger.info(f"저장소 버전 설정: {version}")
        except Exception as e:
            logger.error(f"버전 정보 설정 실패: {str(e)}")

    def check_for_migration(self) -> Dict[str, Any]:
        """
        저장소 버전을 확인하고 필요한 경우 마이그레이션 정보를 반환합니다.

        Returns:
            Dict[str, Any]: 마이그레이션 정보
        """
        storage_version = self.get_storage_version()
        current_version = self.VERSION

        if storage_version is None:
            # 새 저장소 또는 이전 버전에서 업그레이드
            return {
                "needs_migration": True,
                "from_version": "unknown",
                "to_version": current_version,
                "reason": "저장소 버전 정보가 없습니다.",
            }

        if storage_version != current_version:
            return {
                "needs_migration": True,
                "from_version": storage_version,
                "to_version": current_version,
                "reason": "저장소 버전이 현재 버전과 다릅니다.",
            }

        return {"needs_migration": False, "version": current_version}

    # 대량 데이터 처리 성능 최적화 메서드

    def batch_process(
        self, entity_type: EntityType, batch_size: int = 100
    ) -> Generator[List[EntityData], None, None]:
        """
        대용량 엔티티를 배치 단위로 처리할 수 있는 제너레이터 함수입니다.
        메모리 사용량을 최적화하기 위해 전체 데이터를 한 번에 로드하지 않고 배치 단위로 처리합니다.

        Args:
            entity_type: 엔티티 타입
            batch_size: 배치당 처리할 항목 수

        Yields:
            List[Dict[str, Any]]: 엔티티 배치
        """
        file_path = os.path.join(self._storage_dir, f"{entity_type}.json")

        if not os.path.exists(file_path):
            logger.warning(f"{entity_type} 엔티티 파일이 존재하지 않음: {file_path}")
            return

        try:
            # 파일을 스트리밍 모드로 열기
            with open(file_path, "r", encoding="utf-8") as f:
                # 배열 시작 문자('[') 건너뛰기
                char = f.read(1)
                if char != "[":
                    logger.error(f"{entity_type} 파일이 유효한 JSON 배열이 아닙니다.")
                    return

                # 배치 처리 초기화
                batch = []
                current_item = ""
                bracket_count = 0
                in_string = False
                escape_next = False

                # 문자 단위로 파싱하여 JSON 항목 추출
                while True:
                    char = f.read(1)
                    if not char:  # EOF
                        break

                    current_item += char

                    # 문자열 내부 처리
                    if char == "\\" and not escape_next:
                        escape_next = True
                        continue

                    if char == '"' and not escape_next:
                        in_string = not in_string

                    escape_next = False

                    if not in_string:
                        if char == "{":
                            bracket_count += 1
                        elif char == "}":
                            bracket_count -= 1

                            # 항목이 완성됨
                            if bracket_count == 0:
                                # 쉼표와 공백 제거
                                item_json = current_item.strip()
                                if item_json.endswith(","):
                                    item_json = item_json[:-1]

                                try:
                                    item = json.loads(item_json)
                                    batch.append(item)

                                    # 배치가 가득 찼으면 yield
                                    if len(batch) >= batch_size:
                                        yield batch
                                        batch = []
                                except json.JSONDecodeError as e:
                                    logger.error(
                                        f"JSON 파싱 오류: {str(e)}, 항목: {item_json[:100]}..."
                                    )

                                current_item = ""

                # 마지막 배치 처리
                if batch:
                    yield batch

        except Exception as e:
            logger.error(f"배치 처리 중 오류: {str(e)}")

    def bulk_sync_to_offline(
        self,
        entity_type: EntityType,
        entities: List[EntityData],
        chunk_size: int = 1000,
    ) -> Dict[str, Any]:
        """
        대량의 엔티티를 효율적으로 오프라인 저장소에 동기화합니다.

        Args:
            entity_type: 엔티티 타입
            entities: 동기화할 엔티티 목록
            chunk_size: 한 번에 처리할 최대 항목 수

        Returns:
            Dict[str, Any]: 동기화 결과
        """
        if not entities:
            return {
                "status": "success",
                "count": 0,
                "message": "빈 목록이 제공되었습니다.",
            }

        total_count = len(entities)
        processed_count = 0
        chunks = []

        # 청크 단위로 분할
        for i in range(0, total_count, chunk_size):
            chunks.append(entities[i : i + chunk_size])

        start_time = time.time()

        try:
            for chunk in chunks:
                # 각 청크 동기화
                self.sync_to_offline(entity_type, chunk)
                processed_count += len(chunk)

                # 진행 상황 로깅
                logger.info(
                    f"{entity_type} 대량 동기화 진행 중: {processed_count}/{total_count} ({processed_count/total_count*100:.1f}%)"
                )

            elapsed = time.time() - start_time

            # 성능 지표 기록
            if self._metrics_enabled:
                self.record_operation_time(f"bulk_sync_{entity_type}", elapsed)

            result = {
                "status": "success",
                "entity_type": entity_type,
                "total_count": total_count,
                "processed_count": processed_count,
                "elapsed_seconds": elapsed,
                "items_per_second": total_count / elapsed if elapsed > 0 else 0,
            }

            logger.info(
                f"{entity_type} 대량 동기화 완료: {total_count}개 항목, {elapsed:.2f}초 소요"
            )
            return result

        except Exception as e:
            logger.error(f"{entity_type} 대량 동기화 실패: {str(e)}")
            return {
                "status": "error",
                "entity_type": entity_type,
                "total_count": total_count,
                "processed_count": processed_count,
                "error": str(e),
            }

    # REST API 스타일 인터페이스

    def get_entity(
        self, entity_type: EntityType, entity_id: EntityId
    ) -> Optional[EntityData]:
        """
        REST API 스타일로 단일 엔티티를 조회합니다.

        Args:
            entity_type: 엔티티 타입
            entity_id: 엔티티 ID

        Returns:
            Optional[Dict[str, Any]]: 엔티티 데이터 (없으면 None)
        """
        return self.get_entity_lazy(entity_type, entity_id)

    def create_entity(
        self, entity_type: EntityType, entity_data: EntityData
    ) -> EntityData:
        """
        REST API 스타일로 엔티티를 생성합니다.

        Args:
            entity_type: 엔티티 타입
            entity_data: 엔티티 데이터

        Returns:
            Dict[str, Any]: 생성된 엔티티
        """
        if "id" not in entity_data:
            entity_data["id"] = str(uuid.uuid4())

        # 오프라인이면 대기열에 추가
        if self.is_offline:
            operation_id = self.queue_operation(
                entity_type=entity_type,
                operation_type=PendingOperationType.CREATE,
                entity_id=entity_data["id"],
                data=entity_data,
            )
            entity_data["_pending_operation"] = operation_id

        # 현재 엔티티 목록 가져오기
        entities = self.get_offline_data(entity_type)

        # 새 엔티티 추가
        entities.append(entity_data)

        # 저장
        self.sync_to_offline(entity_type, entities)

        return entity_data

    def update_entity(
        self, entity_type: EntityType, entity_id: EntityId, entity_data: EntityData
    ) -> Optional[EntityData]:
        """
        REST API 스타일로 엔티티를 업데이트합니다.

        Args:
            entity_type: 엔티티 타입
            entity_id: 엔티티 ID
            entity_data: 업데이트할 데이터

        Returns:
            Optional[Dict[str, Any]]: 업데이트된 엔티티 (없으면 None)
        """
        # ID 보장
        entity_data["id"] = entity_id

        # 현재 엔티티 목록 가져오기
        entities = self.get_offline_data(entity_type)

        # 엔티티 찾기
        for i, entity in enumerate(entities):
            if entity.get("id") == entity_id:
                # 오프라인이면 대기열에 추가
                if self.is_offline:
                    operation_id = self.queue_operation(
                        entity_type=entity_type,
                        operation_type=PendingOperationType.UPDATE,
                        entity_id=entity_id,
                        data=entity_data,
                    )
                    entity_data["_pending_operation"] = operation_id

                # 엔티티 업데이트
                entities[i] = entity_data

                # 저장
                self.sync_to_offline(entity_type, entities)

                return entity_data

        # 엔티티를 찾지 못함
        logger.warning(
            f"{entity_type}/{entity_id} 엔티티를 찾을 수 없어 업데이트할 수 없습니다."
        )
        return None

    def delete_entity(self, entity_type: EntityType, entity_id: EntityId) -> bool:
        """
        REST API 스타일로 엔티티를 삭제합니다.

        Args:
            entity_type: 엔티티 타입
            entity_id: 엔티티 ID

        Returns:
            bool: 삭제 성공 여부
        """
        # 현재 엔티티 목록 가져오기
        entities = self.get_offline_data(entity_type)

        # 삭제할 엔티티 찾기
        found = False
        new_entities = []

        for entity in entities:
            if entity.get("id") == entity_id:
                found = True

                # 오프라인이면 대기열에 추가
                if self.is_offline:
                    self.queue_operation(
                        entity_type=entity_type,
                        operation_type=PendingOperationType.DELETE,
                        entity_id=entity_id,
                        data={"id": entity_id},
                    )
            else:
                new_entities.append(entity)

        if found:
            # 저장
            self.sync_to_offline(entity_type, new_entities)
            return True
        else:
            logger.warning(
                f"{entity_type}/{entity_id} 엔티티를 찾을 수 없어 삭제할 수 없습니다."
            )
            return False

    def query_entities(
        self,
        entity_type: EntityType,
        filters: Dict[str, Any] = None,
        sort_by: str = None,
        desc: bool = False,
        limit: int = None,
    ) -> List[EntityData]:
        """
        REST API 스타일로 필터링된 엔티티 목록을 조회합니다.

        Args:
            entity_type: 엔티티 타입
            filters: 필터링 조건 (key-value 쌍)
            sort_by: 정렬 기준 필드
            desc: 내림차순 정렬 여부
            limit: 반환할 최대 항목 수

        Returns:
            List[Dict[str, Any]]: 필터링된 엔티티 목록
        """
        entities = self.get_offline_data(entity_type)

        # 필터링
        if filters:
            filtered_entities = []
            for entity in entities:
                match = True
                for key, value in filters.items():
                    if key not in entity or entity[key] != value:
                        match = False
                        break
                if match:
                    filtered_entities.append(entity)
            entities = filtered_entities

        # 정렬
        if sort_by:
            try:
                entities.sort(key=lambda x: x.get(sort_by, ""), reverse=desc)
            except Exception as e:
                logger.error(f"정렬 오류: {str(e)}")

        # 제한
        if limit and isinstance(limit, int) and limit > 0:
            entities = entities[:limit]

        return entities


# 오프라인 관리자 싱글톤 인스턴스
offline_manager = OfflineManager()
