"""
기본 리포지토리 클래스와 SQLAlchemy Base 클래스 모듈.
"""
from typing import Any, Dict, Generic, List, Type, TypeVar, Optional
from sqlalchemy.orm import Session, declarative_base

# SQLAlchemy 2.0 방식으로 Base 클래스 정의
Base = declarative_base()

# 제네릭 타입 정의
ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """기본 CRUD 작업을 위한 베이스 리포지토리"""

    def __init__(self, db: Session, model: Type[ModelType]):
        """
        리포지토리 초기화
        
        Args:
            db: 데이터베이스 세션
            model: 사용할 모델 클래스
        """
        self.db = db
        self.model = model

    def get_by_id(self, id: Any) -> Optional[ModelType]:
        """
        ID로 객체를 조회합니다.
        
        Args:
            id: 조회할 객체의 ID
            
        Returns:
            ID에 해당하는 객체 또는 None
        """
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """
        모든 객체를 조회합니다.
        
        Args:
            skip: 건너뛸 객체 수
            limit: 최대 조회 객체 수
            
        Returns:
            조회된 객체 리스트
        """
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, obj: ModelType) -> ModelType:
        """
        새 객체를 생성합니다.
        
        Args:
            obj: 생성할 객체
            
        Returns:
            생성된 객체
        """
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: Any) -> bool:
        """
        객체를 삭제합니다.
        
        Args:
            id: 삭제할 객체의 ID
            
        Returns:
            삭제 성공 여부
        """
        obj = self.get_by_id(id)
        if not obj:
            return False
        
        self.db.delete(obj)
        self.db.commit()
        return True