"""
Shop API router.
"""

from typing import List, Dict, Any, Optional, Union, Callable, Type, TypeVar, cast
from functools import wraps

from fastapi import (
    APIRouter, Depends, Query, Path, status, 
    File, UploadFile, Response, HTTPException, Form, Body
)
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from ..core.dependencies import get_db, get_current_active_user, get_service
from ..models.schemas import (
    Shop, ShopCreate, ShopUpdate, ShopReview, ShopReviewCreate,
    ShopImageResponse, ShopImageBatchResponse, APIResponse
)
from ..modules.shop.service import ShopService, shop_service
from ..core.cache import cache
from ..core.utils import get_etag, check_etag, validate_image_file
from ..core.constants import CACHE_TTL, FILE_SIZE_LIMITS
from ..core.logging import logger
from ..core.error_handler import handle_exception, error_response
from ..core.response_formatter import api_response
from ..core.cache_manager import CacheManager, generate_cache_key, invalidate_cache_for

from .base_router import BaseRouter

# 상수 정의
SHOP_ID_DESC = "정비소 ID"
DEFAULT_CACHE_TTL = CACHE_TTL.get("shop", 60)  # 기본 캐시 만료 시간 (초)
MAX_IMAGE_SIZE = FILE_SIZE_LIMITS.get("image", 10 * 1024 * 1024)  # 이미지 최대 크기 (10MB)

# 응답 캐싱 데코레이터
def cache_response(ttl: int = DEFAULT_CACHE_TTL, add_jitter: bool = True) -> Callable:
    """
    API 응답을 캐싱하는 데코레이터
    
    Args:
        ttl: 캐시 만료 시간 (초)
        add_jitter: 캐시 만료 시간에 지터 추가 여부
        
    Returns:
        Callable: 데코레이터 함수
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(response: Response, *args, **kwargs) -> APIResponse:
            # 캐시 키 생성
            cache_key = generate_cache_key(
                prefix="shop", 
                function=func.__name__, 
                **{k: v for k, v in kwargs.items() if k not in ["current_user", "_db", "response", "shop_service"]}
            )
            
            # 캐시에서 결과 조회
            if (cached_result := cache.get(cache_key)):
                etag = get_etag(cached_result)
                if check_etag(response, etag):
                    return Response(status_code=304)  # Not Modified
                response.headers["ETag"] = etag
                return cached_result
            
            try:
                # 원래 함수 실행
                result = await func(response, *args, **kwargs)
                
                # 결과 캐싱 (지터 추가 옵션)
                actual_ttl = ttl
                if add_jitter:
                    import random
                    jitter = random.uniform(0.8, 1.2)  # 20% 범위 내의 지터
                    actual_ttl = int(ttl * jitter)
                
                cache.set(cache_key, result, expire=actual_ttl)
                
                # ETag 설정
                etag = get_etag(result)
                response.headers["ETag"] = etag
                
                return result
            except Exception as e:
                return await handle_exception(e, func.__name__)
                
        return wrapper
    return decorator

# 서비스 의존성 함수
def get_shop_service() -> ShopService:
    """Shop 서비스 인스턴스를 제공합니다."""
    return get_service(ShopService)

# BaseRouter 인스턴스 생성
base_router = BaseRouter(
    prefix="/shops",
    tags=["shops"],
    response_model=Shop,
    create_model=ShopCreate,
    update_model=ShopUpdate,
    service=shop_service,
    cache_key_prefix="shop",
    id_field="id"
)

# 헬퍼 함수
def _get_nearby_shops_from_cache(cache_key, response):
    """캐시에서 근처 정비소 정보를 조회"""
    if (cached_result := cache.get(cache_key)):
        etag = get_etag(cached_result)
        if check_etag(response, etag):
            return Response(status_code=304)  # Not Modified
        response.headers["ETag"] = etag
        return cached_result
    return None

def _format_nearby_shops_result(shops, latitude, longitude, distance):
    """근처 정비소 결과를 API 응답 형식으로 포맷팅"""
    return api_response(
        data=shops,
        meta={
            "count": len(shops),
            "params": {
                "latitude": latitude,
                "longitude": longitude, 
                "distance": distance
            }
        }
    )

def _cache_shops_result(cache_key, result, response):
    """정비소 결과를 캐시에 저장하고 ETag를 설정"""
    cache.set(cache_key, result, expire=30)
    etag = get_etag(result)
    response.headers["ETag"] = etag

# ─────────────────────────────────────────────────
# 모듈 레벨 헬퍼 함수들

def _parse_and_validate_metadata(metadata):
    """
    메타데이터 문자열을 파싱하고 검증합니다.
    
    Returns:
        tuple: (meta_list, error_response) - 오류가 있을 경우 error_response는 APIResponse 객체, 없으면 None
    """
    meta_list = []
    if not metadata:
        return meta_list, None
    
    try:
        meta_list = json.loads(metadata)
        if not isinstance(meta_list, list):
            return [], error_response(
                message="메타데이터 형식 오류",
                detail="메타데이터는 JSON 배열 형식이어야 합니다",
                status_code=status.HTTP_400_BAD_REQUEST
            )
    except json.JSONDecodeError:
        return [], error_response(
            message="메타데이터 파싱 오류",
            detail="유효한 JSON 형식이 아닙니다",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    return meta_list, None

def _validate_files_and_metadata(files, meta_list):
    """
    파일과 메타데이터의 유효성을 검증합니다.
    
    Returns:
        Optional[APIResponse]: 오류가 있을 경우 APIResponse 객체, 없으면 None
    """
    # 파일 수와 메타데이터 수 검증
    if meta_list and len(meta_list) != len(files):
        return error_response(
            message="메타데이터 일치 오류",
            detail="메타데이터 항목 수가 파일 수와 일치하지 않습니다",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # 파일 수 제한 확인
    if len(files) > 10:
        return error_response(
            message="파일 수 초과",
            detail="한 번에 최대 10개의 파일만 업로드할 수 있습니다",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    return None

async def _validate_image_files(files):
    """모든 이미지 파일의 유효성을 검증합니다."""
    for file in files:
        await validate_image_file(file, max_size=MAX_IMAGE_SIZE)

async def _upload_individual_images(shop_service, shop_id, files, meta_list):
    """
    개별 이미지들을 업로드하고 결과를 반환합니다.
    
    Returns:
        list: 업로드된 이미지 결과 목록
    """
    results = []
    for i, file in enumerate(files):
        meta = meta_list[i] if i < len(meta_list) else None
        
        # 개별 이미지 업로드
        result = shop_service.upload_shop_image(
            shop_id=shop_id,
            file=file,
            metadata=meta
        )
        
        results.append({
            "image": result,
            "file_info": {
                "filename": file.filename,
                "size": file.size
            }
        })
    
    return results

def _validate_period(period: str, valid_periods: list) -> 'Optional[APIResponse]':
    if period not in valid_periods:
        return error_response(
            message="유효하지 않은 통계 기간입니다",
            detail=f"{', '.join(valid_periods)} 중 하나여야 합니다",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    return None

# ─────────────────────────────────────────────────
# 모듈 레벨 라우터와 엔드포인트
shop_extended_router = APIRouter()

@shop_extended_router.get("/nearby", response_model=APIResponse)
async def find_nearby_shops(
    response: Response,
    latitude: float = Query(..., description="현재 위치 위도", ge=-90, le=90),
    longitude: float = Query(..., description="현재 위치 경도", ge=-180, le=180),
    distance: float = Query(10.0, description="검색 반경(km)", ge=0.1, le=100),
    limit: int = Query(10, ge=1, le=50, description="최대 반환 개수"),
    shop_service: ShopService = Depends(get_shop_service),
    _db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
) -> APIResponse:
    """
    근처 정비소를 검색합니다.
    """
    try:
        # 캐싱 키 생성
        cache_key = f"shop:nearby:{latitude:.6f}:{longitude:.6f}:{distance}:{limit}"

        if cached_result := _get_nearby_shops_from_cache(cache_key, response):
            return cached_result

        # 정비소 검색
        shops = shop_service.find_nearby_shops(
            latitude=latitude,
            longitude=longitude,
            distance=distance,
            limit=limit
        )

        # 결과 포맷팅
        result = _format_nearby_shops_result(shops, latitude, longitude, distance)

        # 결과 캐싱 및 ETag 설정
        _cache_shops_result(cache_key, result, response)

        return result
    except Exception as e:
        logger.error(f"근처 정비소 검색 중 오류 발생: {str(e)}")
        return error_response(
            message="근처 정비소 검색 중 오류가 발생했습니다",
            detail=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# 다른 엔드포인트들도 유사한 방식으로 모듈 레벨 함수로 정의하여 shop_extended_router에 추가

# [변경] extend_shop_router 함수 단순화 - 기존 중첩 엔드포인트 제거 및 단일 라우터 포함

def extend_shop_router(router: APIRouter) -> None:
    router.include_router(shop_extended_router)

# 확장 함수 등록
base_router.extend_router(extend_shop_router)

# 라우터 객체 가져오기
router = base_router.get_router()