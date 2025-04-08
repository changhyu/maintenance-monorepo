"""
Shop API router.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from ..core.dependencies import get_db, get_current_active_user
from ..models.schemas import (
    Shop, ShopCreate, ShopUpdate, ShopReview, ShopReviewCreate
)
from ..modules.shop.service import shop_service


router = APIRouter(prefix="/shops", tags=["shops"])


@router.get("/", response_model=Dict[str, Any])
async def list_shops(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    search: Optional[str] = Query(None, description="검색어"),
    latitude: Optional[float] = Query(None, description="위도"),
    longitude: Optional[float] = Query(None, description="경도"),
    distance: Optional[float] = Query(None, description="거리(km)"),
    service_type: Optional[str] = Query(None, description="서비스 유형"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 목록을 조회합니다.
    """
    filters = {}
    
    if search:
        filters["search"] = search
    if service_type:
        filters["service_type"] = service_type
    if latitude and longitude and distance:
        filters["location"] = {
            "latitude": latitude,
            "longitude": longitude,
            "distance": distance
        }
    
    result = shop_service.get_shops(
        skip=skip,
        limit=limit,
        filters=filters
    )
    
    return {
        "shops": result["shops"],
        "total": result["total"],
        "page": skip // limit + 1,
        "pages": (result["total"] + limit - 1) // limit
    }


@router.get("/{shop_id}", response_model=Shop)
async def get_shop(
    shop_id: str = Path(..., description="정비소 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    특정 정비소의 상세 정보를 조회합니다.
    """
    return shop_service.get_shop_by_id(shop_id)


@router.post("/", response_model=Shop, status_code=status.HTTP_201_CREATED)
async def create_shop(
    shop_data: ShopCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    새 정비소를 등록합니다.
    """
    return shop_service.create_shop(shop_data)


@router.put("/{shop_id}", response_model=Shop)
async def update_shop(
    shop_data: ShopUpdate,
    shop_id: str = Path(..., description="정비소 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 정보를 업데이트합니다.
    """
    return shop_service.update_shop(shop_id, shop_data)


@router.delete("/{shop_id}", response_model=bool)
async def delete_shop(
    shop_id: str = Path(..., description="정비소 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소를 삭제합니다.
    """
    return shop_service.delete_shop(shop_id)


@router.get("/{shop_id}/reviews", response_model=Dict[str, Any])
async def get_shop_reviews(
    shop_id: str = Path(..., description="정비소 ID"),
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 리뷰 목록을 조회합니다.
    """
    result = shop_service.get_shop_reviews(
        shop_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "reviews": result["reviews"],
        "total": result["total"],
        "page": skip // limit + 1,
        "pages": (result["total"] + limit - 1) // limit
    }


@router.post("/{shop_id}/reviews", response_model=ShopReview, status_code=status.HTTP_201_CREATED)
async def create_shop_review(
    review_data: ShopReviewCreate,
    shop_id: str = Path(..., description="정비소 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 리뷰를 작성합니다.
    """
    return shop_service.create_shop_review(shop_id, review_data)


@router.get("/nearby", response_model=List[Dict[str, Any]])
async def find_nearby_shops(
    latitude: float = Query(..., description="현재 위치 위도"),
    longitude: float = Query(..., description="현재 위치 경도"),
    distance: float = Query(10.0, description="검색 반경(km)"),
    limit: int = Query(10, ge=1, le=50, description="최대 반환 개수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    근처 정비소를 검색합니다.
    """
    return shop_service.find_nearby_shops(
        latitude=latitude,
        longitude=longitude,
        distance=distance,
        limit=limit
    )


@router.post("/{shop_id}/images", response_model=Dict[str, Any])
async def upload_shop_image(
    shop_id: str = Path(..., description="정비소 ID"),
    file: UploadFile = File(..., description="업로드할 이미지"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 이미지를 업로드합니다.
    """
    return shop_service.upload_shop_image(shop_id, file)


@router.delete("/{shop_id}/images/{image_id}", response_model=bool)
async def delete_shop_image(
    shop_id: str = Path(..., description="정비소 ID"),
    image_id: str = Path(..., description="이미지 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 이미지를 삭제합니다.
    """
    return shop_service.delete_shop_image(shop_id, image_id)


@router.get("/{shop_id}/services", response_model=List[Dict[str, Any]])
async def get_shop_services(
    shop_id: str = Path(..., description="정비소 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소에서 제공하는 서비스 목록을 조회합니다.
    """
    return shop_service.get_shop_services(shop_id)


@router.get("/{shop_id}/availability", response_model=Dict[str, Any])
async def check_shop_availability(
    shop_id: str = Path(..., description="정비소 ID"),
    service_date: str = Query(..., description="서비스 희망일(YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소의 특정 날짜 예약 가능 여부를 확인합니다.
    """
    return shop_service.check_shop_availability(shop_id, service_date)


@router.get("/statistics", response_model=Dict[str, Any])
async def get_shop_statistics(
    period: str = Query("month", description="통계 기간(week, month, year)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비소 통계 정보를 조회합니다.
    """
    return shop_service.get_shop_statistics(period) 