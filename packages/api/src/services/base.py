"""
서비스 계층의 기본 클래스 정의
모든 서비스 클래스는 이 기본 클래스를 상속받아 구현됩니다.
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from packages.api.srccore.auth import User
from packages.api.srccore.logging_setup import get_logger

# 제네릭 타입 변수 정의
T = TypeVar("T")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

# 로거
logger = get_logger(__name__)


class BaseService:
    """
    모든 서비스의 기본 클래스
    공통 기능과 의존성을 제공합니다.
    """

    def __init__(self, session: AsyncSession, current_user: Optional[User] = None):
        """
        초기화

        Args:
            session: 데이터베이스 세션
            current_user: 현재 인증된 사용자 (선택 사항)
        """
        self.session = session
        self.current_user = current_user
        self.logger = logger

    async def check_permissions(self, action: str, resource: Any) -> bool:
        """
        사용자 권한 확인

        Args:
            action: 수행하려는 작업 (예: "read", "create", "update", "delete")
            resource: 접근하려는 리소스

        Returns:
            권한 있음 여부
        """
        # 인증된 사용자가 없으면 권한 없음
        if not self.current_user:
            return False

        # 여기에 실제 권한 검사 로직 구현
        # 예: 역할 기반 접근 제어(RBAC), 속성 기반 접근 제어(ABAC) 등

        # 기본적으로 관리자는 모든 권한 있음
        if self.current_user.is_admin:
            return True

        # 예시로 간단한 권한 검사
        if action == "read":
            # 읽기는 모든 인증된 사용자에게 허용
            return True
        elif action in ("create", "update", "delete"):
            # 해당 리소스의 소유자만 수정/삭제 가능
            if hasattr(resource, "owner_id"):
                return resource.owner_id == self.current_user.id

        return False

    def raise_not_found(self, entity_name: str, entity_id: Any = None) -> None:
        """
        엔티티를 찾을 수 없을 때 예외 발생

        Args:
            entity_name: 엔티티 이름
            entity_id: 엔티티 ID (선택 사항)
        """
        message = f"{entity_name} not found"
        if entity_id is not None:
            message += f" with id {entity_id}"

        self.logger.warning(message)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)

    def raise_permission_denied(self, action: str, resource_name: str) -> None:
        """
        권한 부족 시 예외 발생

        Args:
            action: 시도한 작업
            resource_name: 리소스 이름
        """
        message = f"Permission denied to {action} {resource_name}"
        self.logger.warning(
            f"User {self.current_user.id if self.current_user else 'anonymous'}: {message}"
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)

    async def commit(self) -> None:
        """데이터베이스 트랜잭션 커밋"""
        await self.session.commit()

    async def rollback(self) -> None:
        """데이터베이스 트랜잭션 롤백"""
        await self.session.rollback()


class CRUDService(BaseService, Generic[T, CreateSchemaType, UpdateSchemaType]):
    """
    기본적인 CRUD 작업을 제공하는 제네릭 서비스 클래스
    모델 유형과 스키마 유형에 대해 유연하게 작동합니다.
    """

    def __init__(
        self, model: Type[T], session: AsyncSession, current_user: Optional[User] = None
    ):
        """
        초기화

        Args:
            model: ORM 모델 클래스
            session: 데이터베이스 세션
            current_user: 현재 인증된 사용자 (선택 사항)
        """
        super().__init__(session=session, current_user=current_user)
        self.model = model

    async def get(self, id: Any) -> Optional[T]:
        """
        ID로 항목 조회

        Args:
            id: 항목 ID

        Returns:
            조회된 항목 또는 None
        """
        return await self.session.get(self.model, id)

    async def get_all(
        self, skip: int = 0, limit: int = 100, filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """
        여러 항목 조회

        Args:
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            filters: 필터링 조건

        Returns:
            항목 목록
        """
        from sqlalchemy import select

        query = select(self.model)

        # 필터 적용
        if filters:
            for attr, value in filters.items():
                if hasattr(self.model, attr):
                    query = query.where(getattr(self.model, attr) == value)

        # 페이징 적용
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, data: CreateSchemaType) -> T:
        """
        새 항목 생성

        Args:
            data: 생성할 항목 데이터

        Returns:
            생성된 항목
        """
        # 입력 데이터를 딕셔너리로 변환 (Pydantic 모델인 경우)
        if hasattr(data, "model_dump"):
            obj_data = data.model_dump(exclude_unset=True)
        else:
            obj_data = data

        # 소유자 설정 (해당 필드가 있는 경우)
        if hasattr(self.model, "owner_id") and self.current_user:
            obj_data["owner_id"] = self.current_user.id

        # 항목 생성
        db_obj = self.model(**obj_data)
        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(self, id: Any, data: Union[UpdateSchemaType, Dict[str, Any]]) -> T:
        """
        항목 업데이트

        Args:
            id: 업데이트할 항목 ID
            data: 업데이트 데이터

        Returns:
            업데이트된 항목

        Raises:
            HTTPException: 항목을 찾을 수 없거나 권한이 없는 경우
        """
        db_obj = await self.get(id)
        if not db_obj:
            self.raise_not_found(self.model.__name__, id)

        # 권한 확인
        has_permission = await self.check_permissions("update", db_obj)
        if not has_permission:
            self.raise_permission_denied("update", self.model.__name__)

        # 입력 데이터를 딕셔너리로 변환 (Pydantic 모델인 경우)
        if hasattr(data, "model_dump"):
            update_data = data.model_dump(exclude_unset=True)
        else:
            update_data = data

        # 항목 필드 업데이트
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def delete(self, id: Any) -> bool:
        """
        항목 삭제

        Args:
            id: 삭제할 항목 ID

        Returns:
            성공 여부

        Raises:
            HTTPException: 항목을 찾을 수 없거나 권한이 없는 경우
        """
        db_obj = await self.get(id)
        if not db_obj:
            self.raise_not_found(self.model.__name__, id)

        # 권한 확인
        has_permission = await self.check_permissions("delete", db_obj)
        if not has_permission:
            self.raise_permission_denied("delete", self.model.__name__)

        await self.session.delete(db_obj)
        return True
