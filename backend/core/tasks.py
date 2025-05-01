import asyncio
import logging
import functools
import time
from typing import Any, Callable, Dict, List, Optional, TypeVar, Coroutine
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)

# 비동기 작업을 위한 글로벌 이벤트 루프 및 스레드 풀
_thread_pool = ThreadPoolExecutor()
_loop = None
_background_tasks = set()

def get_event_loop():
    """현재 스레드의 이벤트 루프를 반환하거나 생성합니다."""
    global _loop
    
    if _loop is None or _loop.is_closed():
        try:
            _loop = asyncio.get_event_loop()
        except RuntimeError:
            _loop = asyncio.new_event_loop()
            asyncio.set_event_loop(_loop)
    
    return _loop

def run_in_background(coroutine):
    """
    백그라운드에서 코루틴을 실행합니다.
    
    Args:
        coroutine: 실행할 코루틴
    """
    global _background_tasks
    
    loop = get_event_loop()
    task = loop.create_task(coroutine)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    
    return task

def run_in_threadpool(func: Callable, *args, **kwargs) -> Coroutine:
    """
    스레드 풀에서 블로킹 함수를 실행합니다.
    
    Args:
        func: 실행할 함수
        args: 함수 인자
        kwargs: 함수 키워드 인자
        
    Returns:
        결과를 반환하는 코루틴
    """
    loop = get_event_loop()
    return loop.run_in_executor(
        _thread_pool, 
        functools.partial(func, *args, **kwargs)
    )

class TaskManager:
    """장기 실행 작업 관리자"""
    
    _tasks: Dict[str, Dict[str, Any]] = {}
    _lock = threading.Lock()
    
    @classmethod
    def create_task(cls, task_id: str, description: str, task_type: str = None, parameters: Dict[str, Any] = None) -> str:
        """
        새로운 작업을 생성합니다.
        
        Args:
            task_id: 작업 ID
            description: 작업 설명
            task_type: 작업 유형
            parameters: 작업 파라미터
            
        Returns:
            생성된 작업의 ID
        """
        with cls._lock:
            cls._tasks[task_id] = {
                "id": task_id,
                "description": description,
                "status": "pending",
                "progress": 0,
                "task_type": task_type,
                "parameters": parameters or {},
                "result": None,
                "error": None,
                "created_at": time.time(),
                "updated_at": time.time()
            }
        
        # 작업을 데이터베이스에 저장
        run_in_background(cls._save_task_to_db(task_id))
        
        return task_id
    
    @classmethod
    async def _save_task_to_db(cls, task_id: str) -> None:
        """
        작업을 데이터베이스에 저장합니다.
        
        Args:
            task_id: 작업 ID
        """
        try:
            # 데이터베이스 모듈 임포트 (순환 참조 방지)
            from backend.db.session import AsyncSessionLocal
            from backend.models.task import Task
            from backend.db.utils import create_entity, update_entity, get_entity_by_id
            
            async with AsyncSessionLocal() as db:
                task_data = cls._tasks.get(task_id)
                if not task_data:
                    return
                
                # 존재하는 작업인지 확인
                existing_task = await get_entity_by_id(db, Task, task_id)
                
                if existing_task:
                    # 기존 작업 업데이트
                    await update_entity(db, Task, task_id, task_data)
                else:
                    # 새 작업 생성
                    await create_entity(db, Task, task_data)
                    
        except Exception as e:
            logger.error(f"작업 저장 중 오류 발생: {str(e)}")
    
    @classmethod
    def update_task(cls, task_id: str, **kwargs) -> None:
        """
        작업 상태를 업데이트합니다.
        
        Args:
            task_id: 작업 ID
            kwargs: 업데이트할 필드
        """
        with cls._lock:
            if task_id not in cls._tasks:
                # 작업이 메모리에 없으면 데이터베이스에서 불러오기 시도
                run_in_background(cls._load_task_from_db(task_id))
                return
            
            task = cls._tasks[task_id]
            for key, value in kwargs.items():
                if key in task:
                    task[key] = value
            
            task["updated_at"] = time.time()
        
        # 작업을 데이터베이스에 저장
        run_in_background(cls._save_task_to_db(task_id))
    
    @classmethod
    async def _load_task_from_db(cls, task_id: str) -> Optional[Dict[str, Any]]:
        """
        데이터베이스에서 작업을 불러옵니다.
        
        Args:
            task_id: 작업 ID
            
        Returns:
            작업 정보 또는 None
        """
        try:
            # 데이터베이스 모듈 임포트 (순환 참조 방지)
            from backend.db.session import AsyncSessionLocal
            from backend.models.task import Task
            from backend.db.utils import get_entity_by_id
            
            async with AsyncSessionLocal() as db:
                task = await get_entity_by_id(db, Task, task_id)
                
                if task:
                    # 작업 정보를 메모리에 로드
                    task_dict = task.to_dict()
                    with cls._lock:
                        cls._tasks[task_id] = task_dict
                    return task_dict
                
                return None
                    
        except Exception as e:
            logger.error(f"작업 불러오기 중 오류 발생: {str(e)}")
            return None
    
    @classmethod
    async def get_task(cls, task_id: str) -> Optional[Dict[str, Any]]:
        """
        작업 정보를 조회합니다.
        
        Args:
            task_id: 작업 ID
            
        Returns:
            작업 정보 또는 None
        """
        with cls._lock:
            task = cls._tasks.get(task_id)
            
        if task:
            return task
            
        # 메모리에 없으면 데이터베이스에서 불러오기
        return await cls._load_task_from_db(task_id)
    
    @classmethod
    async def get_all_tasks(cls) -> List[Dict[str, Any]]:
        """
        모든 작업 목록을 반환합니다.
        
        Returns:
            작업 목록
        """
        try:
            # 데이터베이스 모듈 임포트 (순환 참조 방지)
            from backend.db.session import AsyncSessionLocal
            from backend.models.task import Task
            from backend.db.utils import get_all_entities
            
            async with AsyncSessionLocal() as db:
                # 데이터베이스에서 모든 작업 불러오기
                tasks = await get_all_entities(db, Task)
                
                # 작업 목록을 딕셔너리로 변환
                task_dicts = [task.to_dict() for task in tasks]
                
                # 메모리 캐시 업데이트
                with cls._lock:
                    for task_dict in task_dicts:
                        cls._tasks[task_dict["id"]] = task_dict
                
                return task_dicts
                    
        except Exception as e:
            logger.error(f"작업 목록 불러오기 중 오류 발생: {str(e)}")
            
            # 에러 발생 시 메모리에 있는 작업만 반환
            with cls._lock:
                return list(cls._tasks.values())
    
    @classmethod
    async def remove_task(cls, task_id: str) -> None:
        """
        작업을 제거합니다.
        
        Args:
            task_id: 작업 ID
        """
        # 메모리에서 제거
        with cls._lock:
            if task_id in cls._tasks:
                del cls._tasks[task_id]
        
        try:
            # 데이터베이스 모듈 임포트 (순환 참조 방지)
            from backend.db.session import AsyncSessionLocal
            from backend.models.task import Task
            from backend.db.utils import delete_entity
            
            async with AsyncSessionLocal() as db:
                # 데이터베이스에서도 제거
                await delete_entity(db, Task, task_id)
                    
        except Exception as e:
            logger.error(f"작업 삭제 중 오류 발생: {str(e)}")

async def run_task_with_progress(
    task_id: str,
    coroutine: Coroutine,
    progress_callback: Optional[Callable[[int], None]] = None,
    timeout: int = 3600,  # 기본 타임아웃 1시간
    notification_recipients: Optional[List[str]] = None,
    send_notification: bool = True
) -> Any:
    """
    진행 상태 업데이트와 함께 작업을 실행합니다.
    
    Args:
        task_id: 작업 ID
        coroutine: 실행할 코루틴
        progress_callback: 진행 상태 업데이트 콜백
        timeout: 작업 타임아웃 (초)
        notification_recipients: 알림 수신자 목록
        send_notification: 알림 전송 여부
        
    Returns:
        작업 결과
    """
    try:
        # 작업 정보 가져오기
        task_info = await TaskManager.get_task(task_id)
        if not task_info:
            logger.error(f"작업 {task_id}을(를) 찾을 수 없습니다.")
            return None
        
        # 작업 상태를 '실행 중'으로 업데이트
        await TaskManager.update_task(task_id, status="running")
        
        # 작업 실행 (타임아웃 적용)
        try:
            result = await asyncio.wait_for(coroutine, timeout=timeout)
        except asyncio.TimeoutError:
            logger.error(f"작업 {task_id}가 {timeout}초 타임아웃 시간을 초과했습니다.")
            await TaskManager.update_task(
                task_id,
                status="timeout",
                error=f"작업이 {timeout}초 안에 완료되지 않았습니다."
            )
            
            # 타임아웃 알림 전송
            if send_notification:
                try:
                    from backend.core.notifications import notify_task_completion, NotificationType
                    await notify_task_completion(
                        task_id=task_id,
                        task_type=task_info.get("task_type", "unknown"),
                        status="timeout",
                        description=task_info.get("description", ""),
                        recipients=notification_recipients,
                        notification_type=NotificationType.IN_APP
                    )
                except Exception as e:
                    logger.error(f"타임아웃 알림 전송 중 오류 발생: {str(e)}")
            
            raise
        
        # 작업 완료
        await TaskManager.update_task(
            task_id,
            status="completed",
            progress=100,
            result=result
        )
        
        # 완료 알림 전송
        if send_notification:
            try:
                from backend.core.notifications import notify_task_completion, NotificationType
                await notify_task_completion(
                    task_id=task_id,
                    task_type=task_info.get("task_type", "unknown"),
                    status="completed",
                    description=task_info.get("description", ""),
                    recipients=notification_recipients,
                    notification_type=NotificationType.IN_APP
                )
            except Exception as e:
                logger.error(f"완료 알림 전송 중 오류 발생: {str(e)}")
        
        return result
    except asyncio.TimeoutError:
        # 타임아웃 예외는 이미 처리했으므로 그대로 전파
        raise
    except Exception as e:
        logger.exception(f"작업 {task_id} 실행 중 오류 발생")
        
        # 작업 정보 가져오기
        task_info = await TaskManager.get_task(task_id)
        
        # 작업 실패
        await TaskManager.update_task(
            task_id,
            status="failed",
            error=str(e)
        )
        
        # 실패 알림 전송
        if send_notification and task_info:
            try:
                from backend.core.notifications import notify_task_completion, NotificationType
                await notify_task_completion(
                    task_id=task_id,
                    task_type=task_info.get("task_type", "unknown"),
                    status="failed",
                    description=task_info.get("description", ""),
                    recipients=notification_recipients,
                    notification_type=NotificationType.IN_APP,
                    metadata={"error": str(e)}
                )
            except Exception as notify_error:
                logger.error(f"실패 알림 전송 중 오류 발생: {str(notify_error)}")
        
        raise 