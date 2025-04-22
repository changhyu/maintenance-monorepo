"""
기본 리포지토리 클래스 모듈.
"""

from typing import Any, Dict, Generic, List, Type, TypeVar

from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from packages.api.src.corelogging import get_logger

# 제네릭 타입 정의
T = TypeVar("T")
M = TypeVar("M")  # 모델 타입
S = TypeVar("S")  # 스키마 타입
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
logger = get_logger("base.repository")


class RepositoryError(Exception):
    """리포지토리 기본 예외 클래스"""

    pass


class EntityNotFoundError(RepositoryError):
    """엔티티를 찾을 수 없을 때 발생하는 예외"""

    pass


class DatabaseOperationError(RepositoryError):
    """데이터베이스 작업 중 발생하는 예외"""

    pass


class ValidationError(RepositoryError):
    """데이터 유효성 검사 실패 시 발생하는 예외"""

    pass


class BaseRepository(Generic[ModelType, CreateSchemaType]):
    """Base repository with common CRUD operations"""

    def __init__(self, db: Session, model: Type[ModelType]):
        self.db = db
        self.model = model

    async def find_all(
        self, skip: int = 0, limit: int = 100, filters: Dict[str, Any] = None
    ) -> List[ModelType]:
        """Find all records with optional filters"""
        query = select(self.model)

        if filters:
            conditions = [
                getattr(self.model, key) == value for key, value in filters.items()
            ]

            if conditions:
                query = query.where(and_(*conditions))

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, obj_in: ModelType) -> ModelType:
        """Create a new record"""
        self.db.add(obj_in)
        await self.db.commit()
        await self.db.refresh(obj_in)
        return obj_in

    async def delete(self, obj: ModelType) -> None:
        """Delete a record"""
        self.db.delete(obj)
        await self.db.commit()
