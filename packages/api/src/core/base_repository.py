"""
기본 리포지토리 클래스 모듈.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, TypeVar, Generic, Type, Tuple
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

from ..core.logging import get_logger
from .metrics import track_db_query_time

# 제네릭 타입 정의
T = TypeVar('T')
M = TypeVar('M')  # 모델 타입
S = TypeVar('S')  # 스키마 타입

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

class BaseRepository(Generic[M, S]):
    """모든 리포지토리의 기본 클래스"""

    def __init__(self, db_session: Session, model_class: Type[M]):
        """
        리포지토리 초기화.

        Args:
            db_session: 데이터베이스 세션
            model_class: 리포지토리가 처리할 모델 클래스
        """
        self.db = db_session
        self.model_class = model_class

    def _build_filter_conditions(self, filters: Dict[str, Any]) -> List:
        """필터 조건을 구축합니다."""
        conditions = []
        if filters:
            for key, value in filters.items():
                if hasattr(self.model_class, key):
                    conditions.append(getattr(self.model_class, key) == value)
        return conditions

    def _apply_pagination(self, query: Query, skip: int, limit: int) -> Query:
        """페이지네이션을 적용합니다."""
        return query.offset(skip).limit(limit)

    @track_db_query_time
    def _get_by_id(self, entity_id: str) -> Optional[M]:
        """ID로 엔티티를 조회합니다."""
        try:
            entity = self.db.query(self.model_class).filter(self.model_class.id == entity_id).first()
            if not entity:
                raise EntityNotFoundError(f"ID가 {entity_id}인 엔티티를 찾을 수 없습니다.")
            return entity
        except SQLAlchemyError as e:
            raise DatabaseOperationError(f"엔티티 조회 중 데이터베이스 오류 발생: {str(e)}") from e

    def _commit_and_refresh(self, obj: T) -> T:
        """변경사항을 커밋하고 모델을 새로고침합니다."""
        try:
            self.db.commit()
            self.db.refresh(obj)
            return obj
        except IntegrityError as e:
            self.db.rollback()
            raise ValidationError(f"데이터 무결성 제약 조건 위반: {str(e)}") from e
        except OperationalError as e:
            self.db.rollback()
            raise DatabaseOperationError(f"데이터베이스 작업 실패: {str(e)}") from e
        except Exception as e:
            self.db.rollback()
            raise DatabaseOperationError(f"예기치 않은 데이터베이스 오류: {str(e)}") from e

    def _handle_db_error(self, error_message_prefix: str, e: Exception):
        """데이터베이스 오류 처리."""
        self.db.rollback()
        error_message = f"{error_message_prefix}: {str(e)}"
        logger.error(error_message)

        if isinstance(e, IntegrityError):
            raise ValidationError(error_message) from e
        elif isinstance(e, OperationalError):
            raise DatabaseOperationError(error_message) from e
        else:
            raise DatabaseOperationError(f"예기치 않은 데이터베이스 오류: {error_message}") from e

    @track_db_query_time
    def find_all(self, skip: int = 0, limit: int = 100, filters: Dict = None) -> Tuple[List[M], int]:
        """
        모든 항목 조회.
        
        Args:
            skip: 건너뛸 항목 수
            limit: 최대 항목 수 
            filters: 필터 조건
            
        Returns:
            Tuple[List[M], int]: 항목 목록과 총 개수
            
        Raises:
            DatabaseOperationError: 데이터베이스 작업 실패 시
        """
        try:
            query = self.db.query(self.model_class)
            
            # 필터 적용
            conditions = self._build_filter_conditions(filters)
            if conditions:
                query = query.filter(and_(*conditions))
            
            # 총 개수 계산
            total = query.count()
            
            # 페이지네이션 적용
            results = self._apply_pagination(query, skip, limit).all()
            
            return results, total
        except SQLAlchemyError as e:
            raise DatabaseOperationError(f"항목 조회 중 데이터베이스 오류 발생: {str(e)}") from e

    @track_db_query_time
    def find_by_id(self, entity_id: str) -> Optional[M]:
        """
        ID로 항목 조회.
        
        Args:
            entity_id: 엔티티 ID
            
        Returns:
            Optional[M]: 조회된 항목 또는 None
        """
        try:
            return self._get_by_id(entity_id)
        except Exception as e:
            logger.error(f"ID {entity_id} 조회 중 오류 발생: {str(e)}")
            return None

    @track_db_query_time
    def create(self, entity: M) -> M:
        """
        새 항목 생성.
        
        Args:
            entity: 생성할 엔티티
            
        Returns:
            M: 생성된 엔티티
        """
        try:
            self.db.add(entity)
            return self._commit_and_refresh(entity)
        except Exception as e:
            self._handle_db_error('항목 생성 중 오류 발생', e)

    @track_db_query_time
    def update(self, entity: M) -> M:
        """
        항목 업데이트.
        
        Args:
            entity: 업데이트할 엔티티
            
        Returns:
            M: 업데이트된 엔티티
        """
        try:
            entity.updated_at = datetime.now(timezone.utc)
            return self._commit_and_refresh(entity)
        except Exception as e:
            self._handle_db_error('항목 업데이트 중 오류 발생', e)

    @track_db_query_time
    def delete(self, entity: M) -> bool:
        """
        항목 삭제.
        
        Args:
            entity: 삭제할 엔티티
            
        Returns:
            bool: 삭제 성공 여부
        """
        try:
            self.db.delete(entity)
            self.db.commit()
            return True
        except Exception as e:
            self._handle_db_error('항목 삭제 중 오류 발생', e)
            return False