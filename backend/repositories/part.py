from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.part import Part
from backend.schemas.part import PartCreate, PartUpdate

def get_parts(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    name: Optional[str] = None,
    part_number: Optional[str] = None,
    category: Optional[str] = None
) -> List[Part]:
    """
    부품 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 결과 수
        limit: 최대 결과 수
        name: 이름으로 필터링
        part_number: 부품 번호로 필터링
        category: 카테고리로 필터링
    
    Returns:
        부품 목록
    """
    query = db.query(Part)
    
    if name:
        query = query.filter(Part.name.ilike(f"%{name}%"))
    
    if part_number:
        query = query.filter(Part.part_number.ilike(f"%{part_number}%"))
    
    if category:
        query = query.filter(Part.category.ilike(f"%{category}%"))
    
    return query.order_by(Part.name).offset(skip).limit(limit).all()

def get_part(db: Session, part_id: int) -> Optional[Part]:
    """
    단일 부품 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        part_id: 부품 ID
        
    Returns:
        부품 객체 또는 None
    """
    return db.query(Part).filter(Part.id == part_id).first()

def get_part_by_number(db: Session, part_number: str) -> Optional[Part]:
    """
    부품 번호로 부품을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        part_number: 부품 번호
        
    Returns:
        부품 객체 또는 None
    """
    return db.query(Part).filter(Part.part_number == part_number).first()

def create_part(db: Session, part: PartCreate) -> Part:
    """
    새로운 부품을 등록합니다.
    
    Args:
        db: 데이터베이스 세션
        part: 부품 생성 스키마
        
    Returns:
        생성된 부품 객체
    """
    db_part = Part(**part.dict())
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part

def update_part(db: Session, part_id: int, part: PartUpdate) -> Optional[Part]:
    """
    기존 부품 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        part_id: 부품 ID
        part: 부품 업데이트 스키마
        
    Returns:
        업데이트된 부품 객체 또는 None
    """
    db_part = get_part(db, part_id)
    if not db_part:
        return None
    
    update_data = part.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_part, field, value)
    
    db.commit()
    db.refresh(db_part)
    return db_part

def delete_part(db: Session, part_id: int) -> bool:
    """
    부품을 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        part_id: 부품 ID
        
    Returns:
        성공 여부
    """
    db_part = get_part(db, part_id)
    if not db_part:
        return False
    
    db.delete(db_part)
    db.commit()
    return True

def update_part_stock(db: Session, part_id: int, quantity: int) -> Optional[Part]:
    """
    부품 재고를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        part_id: 부품 ID
        quantity: 변경할 수량 (양수: 입고, 음수: 출고)
        
    Returns:
        업데이트된 부품 객체 또는 None
    """
    db_part = get_part(db, part_id)
    if not db_part:
        return None
    
    db_part.stock = max(0, db_part.stock + quantity)
    
    db.commit()
    db.refresh(db_part)
    return db_part