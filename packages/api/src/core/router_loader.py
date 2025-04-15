"""
라우터 로더 모듈
API 경로 라우터를 동적으로 로드하고 관리하는 기능을 제공합니다.
"""
import logging
import importlib
from typing import List, Optional
from contextlib import suppress
import traceback
from fastapi import APIRouter

logger = logging.getLogger(__name__)

def import_router(module_path: str, router_name: str = "router") -> APIRouter:
    """
    지정된 모듈 경로에서 라우터를 안전하게 임포트합니다.
    
    Args:
        module_path: 임포트할 모듈 경로 (예: ".routers.auth")
        router_name: 임포트할 라우터 객체 이름 (기본값: "router")
        
    Returns:
        임포트된 라우터 또는 에러 처리를 위한 기본 라우터
    """
    try:
        # 상대 경로 처리 (.으로 시작하는 경로)
        if module_path.startswith('.'):
            package = 'src'
            module = importlib.import_module(module_path, package)
        else:
            module = importlib.import_module(module_path)
            
        router = getattr(module, router_name)
        logger.info(f"{module_path} 라우터를 성공적으로 로드했습니다.")
        return router
    except ImportError as e:
        logger.warning(f"{module_path} 모듈을 임포트할 수 없습니다: {str(e)}")
        # 에러 발생 시 기본 라우터 생성
        module_name = module_path.split(".")[-1]
        default_router = APIRouter(prefix=f"/{module_name}", tags=[module_name])
        
        @default_router.get("/")
        async def module_import_error():
            return {
                "error": f"{module_name} 모듈 로드 실패",
                "message": "모듈을 찾을 수 없거나 의존성 문제가 발생했습니다."
            }
        
        return default_router
    except AttributeError as e:
        logger.warning(f"{module_path} 모듈에 {router_name} 객체가 없습니다: {str(e)}")
        # 라우터 객체가 없는 경우 기본 라우터 생성
        module_name = module_path.split(".")[-1]
        default_router = APIRouter(prefix=f"/{module_name}", tags=[module_name])
        
        @default_router.get("/")
        async def router_not_found_error():
            return {
                "error": f"{module_name} 라우터를 찾을 수 없음",
                "message": f"{module_path} 모듈에 {router_name} 객체가 정의되지 않았습니다."
            }
        
        return default_router
    except Exception as e:
        # 기타 예외 처리
        logger.error(f"{module_path} 라우터 로드 중 예외 발생: {str(e)}")
        error_details = traceback.format_exc()
        logger.debug(f"상세 오류: {error_details}")
        
        module_name = module_path.split(".")[-1]
        default_router = APIRouter(prefix=f"/{module_name}", tags=[module_name])
        
        @default_router.get("/")
        async def unexpected_error():
            return {
                "error": f"{module_name} 라우터 로드 실패",
                "message": f"예상치 못한 오류: {str(e)}"
            }
        
        return default_router

def load_routers() -> List[APIRouter]:
    """
    API 애플리케이션의 모든 라우터를 로드합니다.
    
    Returns:
        로드된 라우터 객체 목록
    """
    logger.info("API 라우터 로드 중...")
    routers = []
    
    # 기본 라우터 로드
    router_paths = [
        ".routers.auth",
        ".routers.vehicles",
        ".routers.maintenance",
        ".routers.shops",
    ]
    
    # 라우터 임포트
    for path in router_paths:
        router = import_router(path)
        routers.append(router)
    
    # Todo 라우터 특별 처리 (의존성 확인 필요)
    try:
        # 먼저 의존성 모듈들을 확인
        from src.core.offline_manager import offline_manager, PendingOperationType
        from src.modules.todo.service import TodoService
        
        # 모든 의존성이 성공적으로 임포트되면 실제 라우터 임포트
        todo_router = import_router(".routers.todos")
        routers.append(todo_router)
        logger.info("Todo 라우터가 성공적으로 로드되었습니다.")
    except ImportError as e:
        # 구체적인 오류 메시지 기록
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Todo 라우터 로드 실패: {str(e)}")
        logger.debug(f"상세 오류: {error_details}")
        
        # 폴백 라우터 정의
        todos_router = APIRouter(prefix="/todos", tags=["todos"])
        
        @todos_router.get("/")
        async def todo_import_error():
            """Todo 모듈 로드 실패 시 에러 메시지 반환"""
            return {
                "error": "Todo 모듈 로드 실패",
                "message": "필요한 의존성을 찾을 수 없습니다. 시스템 관리자에게 문의하세요."
            }
        
        @todos_router.get("/status")
        async def todo_dependency_status():
            """의존성 상태 확인 엔드포인트"""
            # 각 의존성 개별 확인하여 상세 정보 제공
            dependencies = {
                "offline_manager": {"status": "missing", "error": "모듈을 찾을 수 없음"},
                "TodoService": {"status": "missing", "error": "서비스 클래스를 찾을 수 없음"}
            }
            
            # 개별 의존성 확인 시도
            with suppress(ImportError):
                from src.core.offline_manager import offline_manager
                dependencies["offline_manager"]["status"] = "available"
                dependencies["offline_manager"].pop("error", None)
                
            with suppress(ImportError):
                from src.modules.todo.service import TodoService
                dependencies["TodoService"]["status"] = "available"
                dependencies["TodoService"].pop("error", None)
                
            return {
                "module": "todos",
                "status": "error",
                "dependencies": dependencies,
                "message": "모듈을 초기화할 수 없습니다."
            }
        
        routers.append(todos_router)
    
    # 안정적으로 더 많은 라우터를 추가할 수 있습니다.
    # 확장 가능성을 위해 다이나믹 로딩 또는 설정 파일을 사용할 수 있습니다.
    
    logger.info(f"총 {len(routers)}개의 라우터를 로드했습니다.")
    return routers 