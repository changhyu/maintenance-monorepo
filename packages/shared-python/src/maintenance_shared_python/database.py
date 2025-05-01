"""
차량 정비 관리 시스템의 데이터베이스 유틸리티 모듈

이 모듈은 SQLAlchemy를 사용한 데이터베이스 연결 및 세션 관리 유틸리티를 제공합니다.
데이터베이스 트랜잭션, 마이그레이션, 모델 확장 기능 등을 포함합니다.
"""

import logging
from contextlib import contextmanager
from typing import (
    Any, Callable, Dict, Generator, List, Optional, 
    Tuple, TypeVar, Union, cast, Generic,
    Type,  # 명시적으로 Type 임포트 추가
)

from sqlalchemy import Column, DateTime, Integer, String, Boolean, func, create_engine, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeMeta, Session, sessionmaker
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, DataError
from sqlalchemy.ext.declarative import declared_attr

from pydantic import BaseModel

# 타입 변수 정의
T = TypeVar('T')
ModelType = TypeVar('ModelType')
CreateSchemaType = TypeVar('CreateSchemaType', bound=BaseModel)
UpdateSchemaType = TypeVar('UpdateSchemaType', bound=BaseModel)

# Base 클래스 생성
Base: DeclarativeMeta = declarative_base()

# 로거 설정
logger = logging.getLogger(__name__)

class DatabaseConfig(BaseModel):
    """데이터베이스 설정 모델"""
    url: str
    echo: bool = False
    pool_size: int = 5
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_recycle: int = 3600
    connect_args: Dict[str, Any] = {}
    is_async: bool = False

class ModelBase:
    """모든 모델의 기본 클래스"""
    
    # 자동 생성되는 ID 필드
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 생성 및 수정 타임스탬프
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # 소프트 삭제 플래그
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # 테이블 이름을 클래스 이름의 스네이크 케이스로 자동 지정
    @declared_attr
    def __tablename__(cls) -> str:
        # CamelCase -> snake_case 변환 (예: UserProfile -> user_profile)
        name = cls.__name__
        result = [name[0].lower()]
        for char in name[1:]:
            if char.isupper():
                result.append('_')
                result.append(char.lower())
            else:
                result.append(char)
        return ''.join(result)
    
    def to_dict(self) -> Dict[str, Any]:
        """모델 인스턴스를 사전으로 변환"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Any:
        """사전에서 모델 인스턴스 생성"""
        return cls(**{
            k: v for k, v in data.items() 
            if k in [c.name for c in cls.__table__.columns]
        })

class Database:
    """데이터베이스 관리 클래스"""
    
    def __init__(self, config: DatabaseConfig):
        """
        데이터베이스 인스턴스 초기화
        
        Args:
            config: 데이터베이스 설정
        """
        self.config = config
        self.engine = self._create_engine()
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self._is_connected = False
    
    def _create_engine(self):
        """엔진 생성"""
        if self.config.is_async:
            # 비동기 엔진 (필요시 asyncpg 의존성 설치 필요)
            try:
                from sqlalchemy.ext.asyncio import create_async_engine
                return create_async_engine(
                    self.config.url,
                    echo=self.config.echo,
                    pool_size=self.config.pool_size,
                    max_overflow=self.config.max_overflow,
                    pool_timeout=self.config.pool_timeout,
                    pool_recycle=self.config.pool_recycle,
                    connect_args=self.config.connect_args
                )
            except ImportError:
                logger.warning("비동기 엔진 생성 실패: asyncpg 의존성이 설치되지 않았습니다.")
                # 비동기 지원이 없으면 기본 엔진으로 폴백
                pass
        
        # 동기 엔진
        return create_engine(
            self.config.url,
            echo=self.config.echo,
            pool_size=self.config.pool_size,
            max_overflow=self.config.max_overflow,
            pool_timeout=self.config.pool_timeout,
            pool_recycle=self.config.pool_recycle,
            connect_args=self.config.connect_args
        )
    
    def create_db_and_tables(self):
        """데이터베이스와 테이블 생성"""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_db_and_tables(self):
        """데이터베이스와 테이블 삭제"""
        Base.metadata.drop_all(bind=self.engine)
    
    def verify_connection(self) -> bool:
        """
        데이터베이스 연결 확인
        
        Returns:
            연결 성공 여부
        """
        try:
            with self.get_session() as session:
                session.execute("SELECT 1")
            self._is_connected = True
            return True
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패: {e}")
            self._is_connected = False
            return False
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """
        세션 컨텍스트 매니저
        
        Yields:
            SQLAlchemy 세션 객체
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"세션 오류: {e}")
            raise
        finally:
            session.close()
    
    @contextmanager
    def transaction(self) -> Generator[Session, None, None]:
        """
        트랜잭션 컨텍스트 매니저
        
        Yields:
            SQLAlchemy 세션 객체
        """
        session = self.SessionLocal()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def get_database_info(self) -> Dict[str, Any]:
        """
        데이터베이스 정보 조회
        
        Returns:
            데이터베이스 정보 사전
        """
        try:
            db_url = make_url(self.config.url)
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()
            
            result = {
                "database_type": db_url.drivername,
                "database_name": db_url.database,
                "hostname": db_url.host,
                "port": db_url.port,
                "username": db_url.username,
                "tables_count": len(tables),
                "tables": tables,
                "is_connected": self._is_connected
            }
            return result
        except Exception as e:
            logger.error(f"데이터베이스 정보 조회 오류: {e}")
            return {
                "error": str(e),
                "is_connected": self._is_connected
            }

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    기본 CRUD 작업을 위한 클래스
    
    이 클래스는 모델 타입에 대한 기본 CRUD 작업을 제공합니다.
    """
    
    def __init__(self, model: Type[ModelType]):
        """
        CRUD 객체 초기화
        
        Args:
            model: 작업할 SQLAlchemy 모델 클래스
        """
        self.model = model
    
    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """
        ID로 단일 레코드 조회
        
        Args:
            db: 데이터베이스 세션
            id: 레코드 ID
            
        Returns:
            찾은 레코드 또는 None
        """
        return db.query(self.model).filter(
            self.model.id == id,
            self.model.is_deleted == False  # 소프트 삭제된 항목 제외
        ).first()
    
    def get_by_field(self, db: Session, field_name: str, value: Any) -> Optional[ModelType]:
        """
        특정 필드 값으로 단일 레코드 조회
        
        Args:
            db: 데이터베이스 세션
            field_name: 필드 이름
            value: 필드 값
            
        Returns:
            찾은 레코드 또는 None
        """
        return db.query(self.model).filter(
            getattr(self.model, field_name) == value,
            self.model.is_deleted == False  # 소프트 삭제된 항목 제외
        ).first()
    
    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        include_deleted: bool = False
    ) -> List[ModelType]:
        """
        다중 레코드 조회 (페이지네이션 지원)
        
        Args:
            db: 데이터베이스 세션
            skip: 건너뛸 레코드 수
            limit: 최대 반환 레코드 수
            include_deleted: 소프트 삭제된 항목 포함 여부
            
        Returns:
            레코드 목록
        """
        query = db.query(self.model)
        
        if not include_deleted:
            query = query.filter(self.model.is_deleted == False)
            
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """
        새 레코드 생성
        
        Args:
            db: 데이터베이스 세션
            obj_in: 생성할 데이터
            
        Returns:
            생성된 레코드
        """
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, 
        db: Session, 
        *, 
        db_obj: ModelType, 
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        레코드 업데이트
        
        Args:
            db: 데이터베이스 세션
            db_obj: 업데이트할 기존 레코드
            obj_in: 새 데이터
            
        Returns:
            업데이트된 레코드
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: Any) -> Optional[ModelType]:
        """
        레코드 하드 삭제
        
        Args:
            db: 데이터베이스 세션
            id: 레코드 ID
            
        Returns:
            삭제된 레코드 또는 None
        """
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj
    
    def soft_delete(self, db: Session, *, id: Any) -> Optional[ModelType]:
        """
        레코드 소프트 삭제
        
        Args:
            db: 데이터베이스 세션
            id: 레코드 ID
            
        Returns:
            소프트 삭제된 레코드 또는 None
        """
        obj = db.query(self.model).get(id)
        if obj:
            obj.is_deleted = True
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj
    
    def count(self, db: Session, *, include_deleted: bool = False) -> int:
        """
        전체 레코드 수 조회
        
        Args:
            db: 데이터베이스 세션
            include_deleted: 소프트 삭제된 항목 포함 여부
            
        Returns:
            레코드 수
        """
        query = db.query(self.model)
        if not include_deleted:
            query = query.filter(self.model.is_deleted == False)
        return query.count()
    
    def restore(self, db: Session, *, id: Any) -> Optional[ModelType]:
        """
        소프트 삭제된 레코드 복원
        
        Args:
            db: 데이터베이스 세션
            id: 레코드 ID
            
        Returns:
            복원된 레코드 또는 None
        """
        obj = db.query(self.model).get(id)
        if obj and obj.is_deleted:
            obj.is_deleted = False
            db.add(obj)
            db.commit()
            db.refresh(obj)
            return obj
        return None
    
    def bulk_create(self, db: Session, *, objs_in: List[CreateSchemaType]) -> List[ModelType]:
        """
        다중 레코드 생성
        
        Args:
            db: 데이터베이스 세션
            objs_in: 생성할 데이터 목록
            
        Returns:
            생성된 레코드 목록
        """
        created_objs = []
        for obj_in in objs_in:
            obj_in_data = obj_in.dict()
            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            created_objs.append(db_obj)
        
        db.commit()
        for obj in created_objs:
            db.refresh(obj)
        
        return created_objs
    
    def bulk_update(
        self, 
        db: Session, 
        *, 
        ids: List[Any], 
        update_data: Dict[str, Any]
    ) -> int:
        """
        다중 레코드 업데이트
        
        Args:
            db: 데이터베이스 세션
            ids: 업데이트할 레코드 ID 목록
            update_data: 업데이트할 데이터
            
        Returns:
            업데이트된 레코드 수
        """
        result = db.query(self.model).filter(
            self.model.id.in_(ids),
            self.model.is_deleted == False
        ).update(update_data, synchronize_session=False)
        
        db.commit()
        return result
    
    def bulk_delete(self, db: Session, *, ids: List[Any], hard_delete: bool = False) -> int:
        """
        다중 레코드 삭제
        
        Args:
            db: 데이터베이스 세션
            ids: 삭제할 레코드 ID 목록
            hard_delete: 하드 삭제 여부
            
        Returns:
            삭제된 레코드 수
        """
        if hard_delete:
            objs = db.query(self.model).filter(self.model.id.in_(ids)).all()
            for obj in objs:
                db.delete(obj)
            db.commit()
            return len(objs)
        else:
            result = db.query(self.model).filter(
                self.model.id.in_(ids),
                self.model.is_deleted == False
            ).update({"is_deleted": True}, synchronize_session=False)
            
            db.commit()
            return result
    
    def get_multi_with_pagination(
        self, 
        db: Session, 
        *, 
        page: int = 1, 
        page_size: int = 20,
        include_deleted: bool = False
    ) -> Tuple[List[ModelType], int, int, int]:
        """
        페이지네이션된 다중 레코드 조회
        
        Args:
            db: 데이터베이스 세션
            page: 페이지 번호 (1부터 시작)
            page_size: 페이지당 항목 수
            include_deleted: 소프트 삭제된 항목 포함 여부
            
        Returns:
            레코드 목록, 총 항목 수, 총 페이지 수, 현재 페이지 번호의 튜플
        """
        query = db.query(self.model)
        
        if not include_deleted:
            query = query.filter(self.model.is_deleted == False)
        
        total_items = query.count()
        total_pages = (total_items + page_size - 1) // page_size if page_size > 0 else 0
        
        # 페이지 범위 검증
        page = max(1, min(page, total_pages)) if total_pages > 0 else 1
        
        # 오프셋 계산
        skip = (page - 1) * page_size
        
        # 결과 조회
        items = query.offset(skip).limit(page_size).all()
        
        return items, total_items, total_pages, page

def get_db(db: Database) -> Generator[Session, None, None]:
    """
    FastAPI 종속성 주입용 데이터베이스 세션 생성기
    
    Args:
        db: 데이터베이스 인스턴스
        
    Yields:
        SQLAlchemy 세션 객체
    """
    with db.get_session() as session:
        yield session

def create_all_tables(db: Database):
    """
    모든 테이블 생성
    
    Args:
        db: 데이터베이스 인스턴스
    """
    try:
        Base.metadata.create_all(bind=db.engine)
        logger.info("모든 테이블 생성 완료")
    except SQLAlchemyError as e:
        logger.error(f"테이블 생성 오류: {e}")
        raise

def drop_all_tables(db: Database):
    """
    모든 테이블 삭제
    
    Args:
        db: 데이터베이스 인스턴스
    """
    try:
        Base.metadata.drop_all(bind=db.engine)
        logger.info("모든 테이블 삭제 완료")
    except SQLAlchemyError as e:
        logger.error(f"테이블 삭제 오류: {e}")
        raise

def initialize_database(config: DatabaseConfig) -> Database:
    """
    데이터베이스 초기화 및 연결 함수
    
    Args:
        config: 데이터베이스 설정
        
    Returns:
        데이터베이스 인스턴스
    """
    db = Database(config)
    
    if not db.verify_connection():
        logger.error("데이터베이스 연결 실패")
        raise ConnectionError("데이터베이스 연결에 실패했습니다.")
    
    logger.info("데이터베이스 연결 성공")
    return db

def handle_db_error(func: Callable[..., T]) -> Callable[..., T]:
    """
    데이터베이스 오류 처리 데코레이터
    
    Args:
        func: 데코레이트할 함수
        
    Returns:
        데코레이트된 함수
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IntegrityError as e:
            logger.error(f"데이터베이스 무결성 오류: {e}")
            raise ValueError("중복된 항목이 있거나 참조 무결성 제약 조건을 위반했습니다.")
        except DataError as e:
            logger.error(f"데이터베이스 데이터 오류: {e}")
            raise ValueError("잘못된 데이터 형식입니다.")
        except SQLAlchemyError as e:
            logger.error(f"데이터베이스 오류: {e}")
            raise RuntimeError("데이터베이스 작업 중 오류가 발생했습니다.")
    
    return wrapper


# SQLAlchemy 모델과 Pydantic 모델 간의 변환 유틸리티 함수들
def model_to_dict(obj: Any) -> Dict[str, Any]:
    """
    SQLAlchemy 모델 인스턴스를 사전으로 변환
    
    Args:
        obj: SQLAlchemy 모델 인스턴스
        
    Returns:
        사전 형태의 객체 데이터
    """
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

def dict_to_model(model_class: Any, data: Dict[str, Any]) -> Any:
    """
    사전에서 SQLAlchemy 모델 인스턴스 생성
    
    Args:
        model_class: SQLAlchemy 모델 클래스
        data: 사전 데이터
        
    Returns:
        SQLAlchemy 모델 인스턴스
    """
    if hasattr(model_class, "from_dict"):
        return model_class.from_dict(data)
    
    return model_class(**{
        k: v for k, v in data.items()
        if k in [c.name for c in model_class.__table__.columns]
    })
