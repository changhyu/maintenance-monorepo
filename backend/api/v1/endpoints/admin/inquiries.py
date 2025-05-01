"""
관리자용 문의 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Body, Path
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from backend.repositories import inquiry as inquiry_repo
from backend.models.user import User
from backend.models.inquiry import InquiryStatus, InquiryType
from backend.schemas.inquiry import (
    InquiryCreate, 
    InquiryUpdate, 
    InquiryResponse, 
    InquiryFilter,
    InquiriesResponse,
    InquiryDetailResponse
)
from backend.core.auth import get_current_active_user, permission_required
from backend.db.session import get_db

# 라우터 정의
router = APIRouter(prefix="/inquiries", tags=["문의 관리"])

# 모든 문의 목록 조회 API (관리자용)
@router.get("/", response_model=InquiriesResponse, summary="모든 문의 목록 조회")
async def get_all_inquiries(
    status: Optional[str] = Query(None, description="상태로 필터링"),
    type: Optional[str] = Query(None, description="유형으로 필터링"),
    is_urgent: Optional[bool] = Query(None, description="긴급 여부로 필터링"),
    category: Optional[str] = Query(None, description="카테고리로 필터링"),
    user_id: Optional[int] = Query(None, description="사용자 ID로 필터링"),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(50, ge=1, le=100, description="최대 결과 수"),
    current_user: User = Depends(permission_required("admin:read")),
    db: Session = Depends(get_db)
):
    """
    시스템에 접수된 모든 문의 목록을 조회합니다. (관리자 전용)
    
    - 다양한 필터 옵션으로 검색이 가능합니다.
    - 페이지네이션을 지원합니다.
    - 결과는 최신순으로 정렬됩니다.
    """
    # 필터 파라미터 처리
    filter_params = InquiryFilter(
        status=status,
        type=type,
        is_urgent=is_urgent,
        category=category,
        user_id=user_id
    )
    
    # 날짜 파라미터 처리
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(f"{start_date}T00:00:00")
            filter_params.start_date = start_datetime
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="시작 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
            )
    
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(f"{end_date}T23:59:59")
            filter_params.end_date = end_datetime
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="종료 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
            )
    
    # 문의 목록 조회
    inquiries, total_count = inquiry_repo.get_inquiries(
        db=db, 
        skip=skip, 
        limit=limit, 
        filter_params=filter_params
    )
    
    # 전체 페이지 수 계산
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
    
    # 목록 결과 생성
    inquiry_list = []
    for inquiry in inquiries:
        inquiry_data = {
            "id": inquiry.id,
            "title": inquiry.title,
            "content": inquiry.content,
            "status": inquiry.status,
            "type": inquiry.type,
            "is_urgent": inquiry.is_urgent,
            "category": inquiry.category,
            "reference_id": inquiry.reference_id,
            "created_at": inquiry.created_at,
            "updated_at": inquiry.updated_at,
            "resolved_at": inquiry.resolved_at,
            "user_id": inquiry.user_id,
            "user_email": inquiry.user.email if inquiry.user else None,
            "user_name": f"{inquiry.user.first_name} {inquiry.user.last_name}" if inquiry.user else None,
            "response": inquiry.response
        }
        inquiry_list.append(inquiry_data)
    
    return {
        "success": True,
        "message": "문의 목록을 성공적으로 조회했습니다",
        "count": len(inquiries),
        "total_count": total_count,
        "page": (skip // limit) + 1 if limit > 0 else 1,
        "total_pages": total_pages,
        "data": inquiry_list
    }

# 특정 문의 상세 조회 API (관리자용)
@router.get("/{inquiry_id}", response_model=InquiryDetailResponse, summary="문의 상세 조회")
async def get_inquiry_detail(
    inquiry_id: int = Path(..., description="문의 ID"),
    current_user: User = Depends(permission_required("admin:read")),
    db: Session = Depends(get_db)
):
    """
    특정 문의의 상세 정보를 조회합니다. (관리자 전용)
    """
    # 문의 조회
    inquiry = inquiry_repo.get_inquiry(db, inquiry_id)
    
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"문의 ID {inquiry_id}를 찾을 수 없습니다."
        )
    
    # 응답 관리자 정보 처리
    responded_by_name = None
    if inquiry.responded_by:
        responded_by_name = f"{inquiry.responded_by.first_name} {inquiry.responded_by.last_name}"
    
    # 응답 데이터 준비
    inquiry_data = {
        "id": inquiry.id,
        "title": inquiry.title,
        "content": inquiry.content,
        "status": inquiry.status,
        "type": inquiry.type,
        "is_urgent": inquiry.is_urgent,
        "category": inquiry.category,
        "reference_id": inquiry.reference_id,
        "created_at": inquiry.created_at,
        "updated_at": inquiry.updated_at,
        "resolved_at": inquiry.resolved_at,
        "user_id": inquiry.user_id,
        "user_email": inquiry.user.email if inquiry.user else None,
        "user_name": f"{inquiry.user.first_name} {inquiry.user.last_name}" if inquiry.user else None,
        "response": inquiry.response,
        "responded_by_id": inquiry.responded_by_id,
        "responded_by_name": responded_by_name
    }
    
    return {
        "success": True,
        "message": "문의 상세 정보를 성공적으로 조회했습니다",
        "data": inquiry_data
    }

# 문의 상태 업데이트 API (관리자용)
@router.patch("/{inquiry_id}/status", response_model=InquiryDetailResponse, summary="문의 상태 업데이트")
async def update_inquiry_status(
    inquiry_id: int = Path(..., description="문의 ID"),
    status_data: dict = Body(..., description="상태 업데이트 데이터", examples={
        "default": {
            "summary": "기본 예시",
            "value": {"status": "IN_PROGRESS"}
        }
    }),
    current_user: User = Depends(permission_required("admin:write")),
    db: Session = Depends(get_db)
):
    """
    문의의 상태를 업데이트합니다. (관리자 전용)
    """
    # 상태 값 검증
    if "status" not in status_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="상태(status) 필드는 필수입니다."
        )
    
    try:
        new_status = InquiryStatus(status_data["status"])
    except ValueError:
        valid_statuses = ", ".join([s.value for s in InquiryStatus])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 상태값입니다. 유효한 값: {valid_statuses}"
        )
    
    # 상태 업데이트
    update_data = InquiryUpdate(status=new_status)
    updated_inquiry = inquiry_repo.update_inquiry(db, inquiry_id, update_data)
    
    if not updated_inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"문의 ID {inquiry_id}를 찾을 수 없습니다."
        )
    
    # 응답 관리자 정보 처리
    responded_by_name = None
    if updated_inquiry.responded_by:
        responded_by_name = f"{updated_inquiry.responded_by.first_name} {updated_inquiry.responded_by.last_name}"
    
    # 응답 데이터 준비
    inquiry_data = {
        "id": updated_inquiry.id,
        "title": updated_inquiry.title,
        "content": updated_inquiry.content,
        "status": updated_inquiry.status,
        "type": updated_inquiry.type,
        "is_urgent": updated_inquiry.is_urgent,
        "category": updated_inquiry.category,
        "reference_id": updated_inquiry.reference_id,
        "created_at": updated_inquiry.created_at,
        "updated_at": updated_inquiry.updated_at,
        "resolved_at": updated_inquiry.resolved_at,
        "user_id": updated_inquiry.user_id,
        "user_email": updated_inquiry.user.email if updated_inquiry.user else None,
        "user_name": f"{updated_inquiry.user.first_name} {updated_inquiry.user.last_name}" if updated_inquiry.user else None,
        "response": updated_inquiry.response,
        "responded_by_id": updated_inquiry.responded_by_id,
        "responded_by_name": responded_by_name
    }
    
    return {
        "success": True,
        "message": f"문의 상태가 '{new_status}'로 성공적으로 업데이트되었습니다",
        "data": inquiry_data
    }

# 문의 응답 API (관리자용)
@router.post("/{inquiry_id}/respond", response_model=InquiryDetailResponse, summary="문의 응답")
async def respond_to_inquiry(
    inquiry_id: int = Path(..., description="문의 ID"),
    response_data: InquiryResponse = Body(..., description="응답 데이터"),
    current_user: User = Depends(permission_required("admin:write")),
    db: Session = Depends(get_db)
):
    """
    문의에 대한 관리자 응답을 등록합니다. (관리자 전용)
    """
    # 문의 응답 처리
    updated_inquiry = inquiry_repo.respond_to_inquiry(
        db=db, 
        inquiry_id=inquiry_id, 
        response_data=response_data, 
        admin_id=current_user.id
    )
    
    if not updated_inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"문의 ID {inquiry_id}를 찾을 수 없습니다."
        )
    
    # 응답 관리자 정보 처리
    responded_by_name = None
    if updated_inquiry.responded_by:
        responded_by_name = f"{updated_inquiry.responded_by.first_name} {updated_inquiry.responded_by.last_name}"
    
    # 응답 데이터 준비
    inquiry_data = {
        "id": updated_inquiry.id,
        "title": updated_inquiry.title,
        "content": updated_inquiry.content,
        "status": updated_inquiry.status,
        "type": updated_inquiry.type,
        "is_urgent": updated_inquiry.is_urgent,
        "category": updated_inquiry.category,
        "reference_id": updated_inquiry.reference_id,
        "created_at": updated_inquiry.created_at,
        "updated_at": updated_inquiry.updated_at,
        "resolved_at": updated_inquiry.resolved_at,
        "user_id": updated_inquiry.user_id,
        "user_email": updated_inquiry.user.email if updated_inquiry.user else None,
        "user_name": f"{updated_inquiry.user.first_name} {updated_inquiry.user.last_name}" if updated_inquiry.user else None,
        "response": updated_inquiry.response,
        "responded_by_id": updated_inquiry.responded_by_id,
        "responded_by_name": responded_by_name
    }
    
    return {
        "success": True,
        "message": "문의 응답이 성공적으로 등록되었습니다",
        "data": inquiry_data
    }

# 문의 통계 API (관리자용)
@router.get("/statistics/summary", summary="문의 통계 요약")
async def get_inquiry_statistics(
    current_user: User = Depends(permission_required("admin:read")),
    db: Session = Depends(get_db)
):
    """
    문의 관련 통계 정보를 조회합니다. (관리자 전용)
    """
    statistics = inquiry_repo.get_inquiry_statistics(db)
    
    # 평균 응답 시간을 읽기 쉬운 형태로 변환
    avg_response_time_readable = None
    if statistics["avg_response_time"]:
        hours = int(statistics["avg_response_time"] // 3600)
        minutes = int((statistics["avg_response_time"] % 3600) // 60)
        avg_response_time_readable = f"{hours}시간 {minutes}분"
    
    # 최근 24시간 내 문의 수를 포함한 통계 데이터
    data = {
        "total_inquiries": statistics["total"],
        "pending_inquiries": statistics["by_status"].get(InquiryStatus.PENDING, 0),
        "in_progress_inquiries": statistics["by_status"].get(InquiryStatus.IN_PROGRESS, 0),
        "resolved_inquiries": statistics["by_status"].get(InquiryStatus.RESOLVED, 0),
        "closed_inquiries": statistics["by_status"].get(InquiryStatus.CLOSED, 0),
        "urgent_inquiries": statistics["urgent_count"],
        "recent_inquiries": statistics["recent_inquiries"],
        "avg_response_time": statistics["avg_response_time"],
        "avg_response_time_readable": avg_response_time_readable,
        "by_type": statistics["by_type"]
    }
    
    return {
        "success": True,
        "message": "문의 통계 정보를 성공적으로 조회했습니다",
        "data": data
    }