from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.shop import Shop
from backend.schemas.shop import ShopCreate, ShopUpdate

def get_shops(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    name: Optional[str] = None
) -> List[Shop]:
    """
    정비소 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 결과 수
        limit: 최대 결과 수
        name: 이름으로 필터링
    
    Returns:
        정비소 목록
    """
    query = db.query(Shop)
    
    if name:
        query = query.filter(Shop.name.ilike(f"%{name}%"))
    
    return query.order_by(Shop.name).offset(skip).limit(limit).all()

def get_shop(db: Session, shop_id: int) -> Optional[Shop]:
    """
    단일 정비소 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        shop_id: 정비소 ID
        
    Returns:
        정비소 객체 또는 None
    """
    return db.query(Shop).filter(Shop.id == shop_id).first()

def create_shop(db: Session, shop: ShopCreate) -> Shop:
    """
    새로운 정비소를 등록합니다.
    
    Args:
        db: 데이터베이스 세션
        shop: 정비소 생성 스키마
        
    Returns:
        생성된 정비소 객체
    """
    db_shop = Shop(**shop.dict())
    db.add(db_shop)
    db.commit()
    db.refresh(db_shop)
    return db_shop

def update_shop(db: Session, shop_id: int, shop: ShopUpdate) -> Optional[Shop]:
    """
    기존 정비소 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        shop_id: 정비소 ID
        shop: 정비소 업데이트 스키마
        
    Returns:
        업데이트된 정비소 객체 또는 None
    """
    db_shop = get_shop(db, shop_id)
    if not db_shop:
        return None
    
    update_data = shop.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_shop, field, value)
    
    db.commit()
    db.refresh(db_shop)
    return db_shop

def delete_shop(db: Session, shop_id: int) -> bool:
    """
    정비소를 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        shop_id: 정비소 ID
        
    Returns:
        성공 여부
    """
    db_shop = get_shop(db, shop_id)
    if not db_shop:
        return False
    
    db.delete(db_shop)
    db.commit()
    return True