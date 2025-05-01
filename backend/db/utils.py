from sqlalchemy import text, func, select, inspect
from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any, Optional, Type, TypeVar, Union, Tuple, Callable, AsyncContextManager
import logging
import contextlib

logger = logging.getLogger(__name__)

T = TypeVar('T')

@contextlib.asynccontextmanager
async def safe_db_transaction(db: AsyncSession) -> AsyncContextManager[AsyncSession]:
    """
    안전한 데이터베이스 트랜잭션을 관리하는 컨텍스트 매니저입니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        
    Yields:
        데이터베이스 세션
        
    Raises:
        SQLAlchemyError: 데이터베이스 오류 발생 시
    """
    try:
        yield db
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"데이터베이스 트랜잭션 오류: {str(e)}")
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"트랜잭션 중 예외 발생: {str(e)}")
        raise

async def get_entity_by_id(db: AsyncSession, model: Type[T], id: Any) -> Optional[T]:
    """
    ID로 단일 엔티티를 비동기적으로 조회합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 조회할 모델 클래스
        id: 엔티티 ID
        
    Returns:
        조회된 엔티티 또는 None
    """
    try:
        query = select(model).where(model.id == id)
        result = await db.execute(query)
        return result.scalars().first()
    except SQLAlchemyError as e:
        logger.error(f"엔티티 조회 오류: {str(e)}")
        raise

async def get_all_entities(
    db: AsyncSession, 
    model: Type[T], 
    skip: int = 0, 
    limit: int = 100,
    order_by: str = None
) -> List[T]:
    """
    모델의 모든 엔티티를 비동기적으로 조회합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 조회할 모델 클래스
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        order_by: 정렬 기준 (형식: "column_name:desc" 또는 "column_name:asc")
        
    Returns:
        엔티티 목록
    """
    try:
        query = select(model)
        
        # 정렬 적용
        if order_by:
            parts = order_by.split(':')
            column_name = parts[0]
            direction = parts[1] if len(parts) > 1 else 'asc'
            
            column = getattr(model, column_name, None)
            if column:
                if direction.lower() == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column.asc())
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:
        logger.error(f"엔티티 목록 조회 오류: {str(e)}")
        raise

async def create_entity(db: AsyncSession, model: Type[T], data: Dict[str, Any]) -> T:
    """
    새 엔티티를 생성합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 생성할 모델 클래스
        data: 엔티티 생성에 사용할 데이터
        
    Returns:
        생성된 엔티티
    """
    async with safe_db_transaction(db) as session:
        entity = model(**data)
        session.add(entity)
        await session.flush()
        await session.refresh(entity)
        return entity

async def update_entity(
    db: AsyncSession, 
    model: Type[T], 
    id: Any, 
    data: Dict[str, Any]
) -> Optional[T]:
    """
    기존 엔티티를 업데이트합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 업데이트할 모델 클래스
        id: 업데이트할 엔티티 ID
        data: 업데이트할 데이터
        
    Returns:
        업데이트된 엔티티 또는 None
    """
    async with safe_db_transaction(db) as session:
        entity = await get_entity_by_id(session, model, id)
        if not entity:
            return None
        
        for key, value in data.items():
            setattr(entity, key, value)
        
        await session.flush()
        await session.refresh(entity)
        return entity

async def delete_entity(db: AsyncSession, model: Type[T], id: Any) -> bool:
    """
    엔티티를 삭제합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 삭제할 모델 클래스
        id: 삭제할 엔티티 ID
        
    Returns:
        삭제 성공 여부
    """
    async with safe_db_transaction(db) as session:
        entity = await get_entity_by_id(session, model, id)
        if not entity:
            return False
        
        await session.delete(entity)
        return True

async def execute_raw_query(db: AsyncSession, query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    원시 SQL 쿼리를 실행합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        query: SQL 쿼리 문자열
        params: 쿼리 파라미터
        
    Returns:
        쿼리 결과를 딕셔너리 목록으로 반환
    """
    try:
        result = await db.execute(text(query), params or {})
        column_names = result.keys()
        return [dict(zip(column_names, row)) for row in result.fetchall()]
    except SQLAlchemyError as e:
        logger.error(f"원시 쿼리 실행 오류: {str(e)}")
        raise

async def get_count(db: AsyncSession, model: Type[T], filter_criteria=None) -> int:
    """
    조건에 맞는 레코드 수를 조회합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 조회할 모델 클래스
        filter_criteria: 필터 조건
        
    Returns:
        레코드 수
    """
    try:
        query = select(func.count()).select_from(model)
        if filter_criteria:
            query = query.where(filter_criteria)
        
        result = await db.execute(query)
        return result.scalar_one()
    except SQLAlchemyError as e:
        logger.error(f"레코드 수 조회 오류: {str(e)}")
        raise

async def get_entity_with_related(
    db: AsyncSession, 
    model: Type[T], 
    id: Any,
    relations: List[str]
) -> Optional[T]:
    """
    관련 엔티티를 포함하여 엔티티를 조회합니다.
    
    Args:
        db: 비동기 데이터베이스 세션
        model: 조회할 모델 클래스
        id: 엔티티 ID
        relations: 포함할 관계 목록
        
    Returns:
        관련 엔티티가 포함된 엔티티 또는 None
    """
    try:
        query = select(model).where(model.id == id)
        
        for relation in relations:
            query = query.options(selectinload(getattr(model, relation)))
        
        result = await db.execute(query)
        return result.scalars().first()
    except SQLAlchemyError as e:
        logger.error(f"관계를 포함한 엔티티 조회 오류: {str(e)}")
        raise 