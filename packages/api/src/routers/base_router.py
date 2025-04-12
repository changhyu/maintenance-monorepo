"""
베이스 API 라우터 모듈.

모든 라우터에서 공통적으로 사용되는 기능을 제공합니다.
"""

from typing import Any, Callable, Dict, Generic, List, Optional, Type, TypeVar
from fastapi import APIRouter, Depends, Query, Path, Response, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.dependencies import get_db, get_current_active_user
from ..core.cache import cache, CacheKey
from ..core.utils import get_etag, check_etag, paginate_list

# 제네릭 타입 변수
T = TypeVar('T', bound=BaseModel)
CreateT = TypeVar('CreateT', bound=BaseModel)
UpdateT = TypeVar('UpdateT', bound=BaseModel)

# 상수 정의
ITEM_ID_DESC = "아이템 ID"
SKIP_DESC = "건너뛸 레코드 수"
LIMIT_DESC = "최대 반환 레코드 수"
SORT_BY_DESC = "정렬 기준 필드"
SORT_ORDER_DESC = "정렬 순서 (asc/desc)"


class BaseRouter(Generic[T, CreateT, UpdateT]):
    """
    API 라우터를 위한 기본 클래스
    
    공통 CRUD 작업 및 캐싱, 응답 처리 등을 제공합니다.
    """
    
    def __init__(
        self,
        prefix: str,
        tags: List[str],
        response_model: Type[T],
        create_model: Type[CreateT],
        update_model: Type[UpdateT],
        service: Any,
        cache_key_prefix: str,
        id_field: str = "id"
    ):
        """
        베이스 라우터 초기화
        
        Args:
            prefix: API 라우터 접두사
            tags: 스웨거 태그
            response_model: 응답 모델 타입
            create_model: 생성 요청 모델 타입
            update_model: 업데이트 요청 모델 타입
            service: 서비스 모듈
            cache_key_prefix: 캐시 키 접두사
            id_field: ID 필드 이름
        """
        self.router = APIRouter(prefix=prefix, tags=tags)
        self.response_model = response_model
        self.create_model = create_model
        self.update_model = update_model
        self.service = service
        self.cache_key_prefix = cache_key_prefix
        self.id_field = id_field
        
        # 기본 CRUD 라우트 등록
        self._register_routes()
    
    def _register_routes(self) -> None:
        """기본 CRUD 라우트 등록"""
        
        # 목록 조회 라우트
        @self.router.get("/", response_model=Dict[str, Any])
        async def list_items(
            response: Response,
            skip: int = Query(0, ge=0, description=SKIP_DESC),
            limit: int = Query(100, ge=1, le=1000, description=LIMIT_DESC),
            sort_by: Optional[str] = Query("created_at", description=SORT_BY_DESC),
            sort_order: Optional[str] = Query("desc", description=SORT_ORDER_DESC),
            db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user),
            **filters
        ):
            """
            아이템 목록을 조회합니다.
            """
            # 캐시 키 생성
            cache_key = f"{self.cache_key_prefix}:list:{skip}:{limit}:{sort_by}:{sort_order}"
            for key, value in filters.items():
                if value is not None:
                    cache_key += f":{key}:{value}"
            
            # 캐시에서 결과 조회
            cached_result = cache.get(cache_key)
            if cached_result:
                etag = get_etag(cached_result)
                if check_etag(response, etag):
                    return Response(status_code=304)  # Not Modified
                response.headers["ETag"] = etag
                return cached_result
            
            # 서비스 요청 및 페이지네이션
            items = self.service.get_items(
                skip=skip,
                limit=limit,
                filters=filters,
                sort_by=sort_by,
                sort_order=sort_order
            )
            
            # 페이지네이션 구성
            result = paginate_list(
                items=items['items'],
                skip=skip,
                limit=limit,
                total_count=items['total']
            )
            
            # 결과 캐싱
            cache.set(cache_key, result, expire=60)
            
            # ETag 설정
            etag = get_etag(result)
            response.headers["ETag"] = etag
            
            return result
        
        # 아이템 상세 조회 라우트
        @self.router.get("/{item_id}", response_model=self.response_model)
        async def get_item(
            response: Response,
            item_id: str = Path(..., description=ITEM_ID_DESC),
            db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user)
        ):
            """
            특정 아이템의 상세 정보를 조회합니다.
            """
            # 캐시 키 생성
            cache_key = f"{self.cache_key_prefix}:detail:{item_id}"
            
            # 캐시에서 결과 조회
            cached_item = cache.get(cache_key)
            if cached_item:
                etag = get_etag(cached_item)
                if check_etag(response, etag):
                    return Response(status_code=304)  # Not Modified
                response.headers["ETag"] = etag
                return cached_item
            
            # 아이템 조회
            item = self.service.get_item_by_id(item_id)
            
            # 결과 캐싱
            cache.set(cache_key, item, expire=120)
            
            # ETag 설정
            etag = get_etag(item)
            response.headers["ETag"] = etag
            
            return item
        
        # 아이템 생성 라우트
        @self.router.post("/", response_model=self.response_model, status_code=status.HTTP_201_CREATED)
        async def create_item(
            item_data: self.create_model,
            _db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user)
        ):
            """
            새 아이템을 생성합니다.
            """
            item = self.service.create_item(item_data)
            
            # 관련 캐시 무효화
            cache.invalidate_pattern(f"{self.cache_key_prefix}:list:*")
            
            return item
        
        # 아이템 업데이트 라우트
        @self.router.put("/{item_id}", response_model=self.response_model)
        async def update_item(
            item_data: self.update_model,
            item_id: str = Path(..., description=ITEM_ID_DESC),
            db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user)
        ):
            """
            아이템 정보를 업데이트합니다.
            """
            item = self.service.update_item(item_id, item_data)
            
            # 관련 캐시 무효화
            cache.delete(f"{self.cache_key_prefix}:detail:{item_id}")
            cache.invalidate_pattern(f"{self.cache_key_prefix}:list:*")
            
            return item
        
        # 아이템 삭제 라우트
        @self.router.delete("/{item_id}", response_model=bool)
        async def delete_item(
            item_id: str = Path(..., description=ITEM_ID_DESC),
            db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user)
        ):
            """
            아이템을 삭제합니다.
            """
            result = self.service.delete_item(item_id)
            
            # 관련 캐시 무효화
            cache.delete(f"{self.cache_key_prefix}:detail:{item_id}")
            cache.invalidate_pattern(f"{self.cache_key_prefix}:list:*")
            
            return result
    
    def extend_router(self, extension_func: Callable[[APIRouter], None]) -> None:
        """
        추가 라우트 등록
        
        Args:
            extension_func: 추가 라우트를 등록하는 함수
        """
        extension_func(self.router)
    
    def get_router(self) -> APIRouter:
        """라우터 인스턴스 반환"""
        return self.router 