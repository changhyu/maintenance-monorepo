from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from backend.models.technician import Technician
from backend.schemas.technician import TechnicianCreate, TechnicianUpdate

def get_technicians(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    name: Optional[str] = None
) -> List[Technician]:
    """
    정비사 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 결과 수
        limit: 최대 결과 수
        name: 이름으로 필터링
    
    Returns:
        정비사 목록
    """
    query = db.query(Technician).options(joinedload(Technician.shop))
    
    if name:
        query = query.filter(Technician.name.ilike(f"%{name}%"))
    
    return query.order_by(Technician.name).offset(skip).limit(limit).all()

def get_technician(db: Session, technician_id: int) -> Optional[Technician]:
    """
    단일 정비사 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        technician_id: 정비사 ID
        
    Returns:
        정비사 객체 또는 None
    """
    return db.query(Technician).options(
        joinedload(Technician.shop)
    ).filter(Technician.id == technician_id).first()

def create_technician(db: Session, technician: TechnicianCreate) -> Technician:
    """
    새로운 정비사를 등록합니다.
    
    Args:
        db: 데이터베이스 세션
        technician: 정비사 생성 스키마
        
    Returns:
        생성된 정비사 객체
    """
    db_technician = Technician(**technician.dict())
    db.add(db_technician)
    db.commit()
    db.refresh(db_technician)
    return db_technician

def update_technician(db: Session, technician_id: int, technician: TechnicianUpdate) -> Optional[Technician]:
    """
    기존 정비사 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        technician_id: 정비사 ID
        technician: 정비사 업데이트 스키마
        
    Returns:
        업데이트된 정비사 객체 또는 None
    """
    db_technician = get_technician(db, technician_id)
    if not db_technician:
        return None
    
    update_data = technician.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_technician, field, value)
    
    db.commit()
    db.refresh(db_technician)
    return db_technician

def delete_technician(db: Session, technician_id: int) -> bool:
    """
    정비사를 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        technician_id: 정비사 ID
        
    Returns:
        성공 여부
    """
    db_technician = get_technician(db, technician_id)
    if not db_technician:
        return False
    
    db.delete(db_technician)
    db.commit()
    return True

def get_technicians_by_shop(
    db: Session, 
    shop_id: int,
    skip: int = 0, 
    limit: int = 100
) -> List[Technician]:
    """
    특정 정비소의 정비사 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        shop_id: 정비소 ID
        skip: 건너뛸 결과 수
        limit: 최대 결과 수
        
    Returns:
        정비사 목록
    """
    return db.query(Technician).options(
        joinedload(Technician.shop)
    ).filter(
        Technician.shop_id == shop_id,
        Technician.is_active == True
    ).order_by(
        Technician.name
    ).offset(skip).limit(limit).all()