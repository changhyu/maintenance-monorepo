"""
문의 관련 데이터베이스 작업을 처리하는 저장소
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple

from backend.models.inquiry import Inquiry, InquiryStatus, InquiryType
from backend.models.user import User
from backend.schemas.inquiry import InquiryCreate, InquiryUpdate, InquiryResponse, InquiryFilter

def get_inquiries(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    filter_params: Optional[InquiryFilter] = None
) -> Tuple[List[Inquiry], int]:
    """
    모든 문의 목록을 조회합니다.
    필터링 옵션을 적용할 수 있습니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 레코드 수
        limit: 최대 결과 수
        filter_params: 필터링 옵션
        
    Returns:
        문의 목록과 총 개수의 튜플
    """
    query = db.query(Inquiry)
    
    # 필터 적용
    if filter_params:
        if filter_params.status:
            query = query.filter(Inquiry.status == filter_params.status)
        if filter_params.type:
            query = query.filter(Inquiry.type == filter_params.type)
        if filter_params.is_urgent is not None:
            query = query.filter(Inquiry.is_urgent == filter_params.is_urgent)
        if filter_params.category:
            query = query.filter(Inquiry.category == filter_params.category)
        if filter_params.user_id:
            query = query.filter(Inquiry.user_id == filter_params.user_id)
        if filter_params.start_date:
            query = query.filter(Inquiry.created_at >= filter_params.start_date)
        if filter_params.end_date:
            query = query.filter(Inquiry.created_at <= filter_params.end_date)
    
    # 총 문의 수 계산
    total_count = query.count()
    
    # 정렬 (최신순)
    query = query.order_by(Inquiry.created_at.desc())
    
    # 페이지네이션
    inquiries = query.offset(skip).limit(limit).all()
    
    return inquiries, total_count

def get_inquiry(db: Session, inquiry_id: int) -> Optional[Inquiry]:
    """
    특정 ID의 문의를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        inquiry_id: 문의 ID
        
    Returns:
        문의 객체 또는 None
    """
    return db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()

def create_inquiry(db: Session, inquiry: InquiryCreate, user_id: int) -> Inquiry:
    """
    새로운 문의를 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        inquiry: 문의 생성 데이터
        user_id: 사용자 ID
        
    Returns:
        생성된 문의 객체
    """
    db_inquiry = Inquiry(
        title=inquiry.title,
        content=inquiry.content,
        type=inquiry.type,
        is_urgent=inquiry.is_urgent,
        category=inquiry.category,
        reference_id=inquiry.reference_id,
        user_id=user_id
    )
    
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    
    return db_inquiry

def update_inquiry(db: Session, inquiry_id: int, inquiry: InquiryUpdate) -> Optional[Inquiry]:
    """
    기존 문의를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        inquiry_id: 문의 ID
        inquiry: 업데이트할 문의 데이터
        
    Returns:
        업데이트된 문의 객체 또는 None
    """
    db_inquiry = get_inquiry(db, inquiry_id)
    
    if not db_inquiry:
        return None
    
    # 업데이트 데이터 적용
    update_data = inquiry.dict(exclude_unset=True)
    
    # 상태가 RESOLVED로 변경된 경우 resolved_at 날짜 기록
    if update_data.get("status") == InquiryStatus.RESOLVED and db_inquiry.status != InquiryStatus.RESOLVED:
        update_data["resolved_at"] = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(db_inquiry, key, value)
    
    db.commit()
    db.refresh(db_inquiry)
    
    return db_inquiry

def delete_inquiry(db: Session, inquiry_id: int) -> bool:
    """
    문의를 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        inquiry_id: 문의 ID
        
    Returns:
        삭제 성공 여부
    """
    db_inquiry = get_inquiry(db, inquiry_id)
    
    if not db_inquiry:
        return False
    
    db.delete(db_inquiry)
    db.commit()
    
    return True

def respond_to_inquiry(db: Session, inquiry_id: int, response_data: InquiryResponse, admin_id: int) -> Optional[Inquiry]:
    """
    문의에 관리자가 응답합니다.
    
    Args:
        db: 데이터베이스 세션
        inquiry_id: 문의 ID
        response_data: 응답 데이터
        admin_id: 관리자 ID
        
    Returns:
        업데이트된 문의 객체 또는 None
    """
    db_inquiry = get_inquiry(db, inquiry_id)
    
    if not db_inquiry:
        return None
    
    # 응답 데이터 설정
    db_inquiry.response = response_data.response
    db_inquiry.responded_by_id = admin_id
    db_inquiry.status = response_data.status
    
    # 상태가 RESOLVED로 변경된 경우 resolved_at 날짜 기록
    if response_data.status == InquiryStatus.RESOLVED and db_inquiry.status != InquiryStatus.RESOLVED:
        db_inquiry.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_inquiry)
    
    return db_inquiry

def get_inquiry_statistics(db: Session) -> Dict[str, Any]:
    """
    문의 통계를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        
    Returns:
        통계 정보 딕셔너리
    """
    # 상태별 문의 수
    status_counts = {}
    for status in InquiryStatus:
        count = db.query(func.count(Inquiry.id)).filter(Inquiry.status == status).scalar()
        status_counts[status] = count
    
    # 유형별 문의 수
    type_counts = {}
    for type_ in InquiryType:
        count = db.query(func.count(Inquiry.id)).filter(Inquiry.type == type_).scalar()
        type_counts[type_] = count
    
    # 긴급 문의 수
    urgent_count = db.query(func.count(Inquiry.id)).filter(Inquiry.is_urgent == True).scalar()
    
    # 미해결 문의 중 가장 오래된 문의
    oldest_pending = db.query(Inquiry) \
        .filter(Inquiry.status == InquiryStatus.PENDING) \
        .order_by(Inquiry.created_at.asc()) \
        .first()
    
    # 최근 24시간 내 문의 수
    recent_inquiries = db.query(func.count(Inquiry.id)) \
        .filter(Inquiry.created_at >= datetime.utcnow() - timedelta(days=1)) \
        .scalar()
    
    # 평균 응답 시간 (resolved_at - created_at)
    # 응답 시간 계산을 위해서는 resolved_at이 null이 아닌 문의만 선택
    avg_response_time = None
    response_time_data = db.query(
        func.avg(Inquiry.resolved_at - Inquiry.created_at)
    ).filter(Inquiry.resolved_at != None).scalar()
    
    if response_time_data:
        # 초 단위로 변환
        avg_response_time = response_time_data.total_seconds()
    
    return {
        "total": db.query(func.count(Inquiry.id)).scalar(),
        "by_status": status_counts,
        "by_type": type_counts,
        "urgent_count": urgent_count,
        "oldest_pending": oldest_pending.created_at if oldest_pending else None,
        "recent_inquiries": recent_inquiries,
        "avg_response_time": avg_response_time
    }