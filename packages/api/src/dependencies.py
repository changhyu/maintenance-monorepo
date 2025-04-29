"""
FastAPI 애플리케이션의 의존성 주입 모듈
이 모듈은 애플리케이션 전체에서 사용되는 의존성(종속성)을 정의합니다.
"""

import logging
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import AsyncGenerator, Callable, Dict, Optional, Type, TypeVar, cast

from fastapi import Depends, Request

from packages.api.srccore.auth import User, get_current_user
from packages.api.srccore.config import Settings, get_settings
from packages.api.srccore.database import AsyncSession, get_async_session
from packages.api.srccore.logging_setup import get_logger

# 서비스 타입 변수 정의 (제네릭 타입)
T = TypeVar("T")

# 로거 인스턴스
logger = get_logger(__name__)


@lru_cache()
def get_settings_dependency() -> Settings:
    """
    설정 의존성을 반환하는 함수
    캐싱된 설정 객체를 반환합니다.

    Returns:
        Settings: 애플리케이션 설정 객체
    """
    return get_settings()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    데이터베이스 세션을 반환하는 의존성 함수

    Yields:
        AsyncSession: 비동기 데이터베이스 세션
    """
    async with get_async_session() as session:
        try:
            yield session
        finally:
            await session.close()


class ServiceFactory:
    """
    서비스 객체를 생성하고 캐싱하는 팩토리 클래스
    의존성 주입을 통해 서비스 레이어의 인스턴스를 관리합니다.
    """

    _instances: Dict[str, object] = {}

    @classmethod
    def get_service(cls, service_class: Type[T], request: Request) -> T:
        """
        서비스 인스턴스를 가져오는 메소드
        서비스 객체가 이미 존재하면 재사용하고, 없으면 생성합니다.

        Args:
            service_class: 서비스 클래스 타입
            request: FastAPI 요청 객체

        Returns:
            서비스 클래스의 인스턴스
        """
        service_name = service_class.__name__

        # 요청 상태에 서비스 인스턴스가 없으면 생성
        if service_name not in request.state.services:
            # 서비스 초기화 - 일반적으로 세션과 현재 사용자 정보를 주입
            session = request.state.session
            user = getattr(request.state, "user", None)

            # 서비스 인스턴스 생성 및 저장
            service_instance = service_class(session=session, current_user=user)
            request.state.services[service_name] = service_instance
            logger.debug(f"서비스 생성: {service_name}")

        return cast(T, request.state.services[service_name])


def get_service_dependency(service_class: Type[T]) -> Callable[[Request], T]:
    """
    서비스 의존성을 생성하는 팩토리 함수

    Args:
        service_class: 서비스 클래스 타입

    Returns:
        서비스 의존성 함수
    """

    def _get_service(request: Request) -> T:
        return ServiceFactory.get_service(service_class, request)

    return _get_service


# 미들웨어에서 사용할 초기화 및 정리 컨텍스트 매니저
@asynccontextmanager
async def lifespan_dependencies(request: Request):
    """
    요청별 의존성 생명주기 관리
    요청 처리 전에 필요한 자원을 초기화하고 처리 후 정리합니다.

    Args:
        request: FastAPI 요청 객체
    """
    # 요청에 서비스 컨테이너 초기화
    request.state.services = {}

    # 데이터베이스 세션 생성
    session = next(get_db_session())
    request.state.session = session

    try:
        # 요청 처리
        yield
    finally:
        # 자원 정리
        request.state.services.clear()
        await session.close()


# 현재 인증된 사용자를 가져오는 의존성
async def get_current_user_dependency(request: Request) -> Optional[User]:
    """
    현재 인증된 사용자 정보를 반환하는 의존성 함수

    Args:
        request: FastAPI 요청 객체

    Returns:
        User: 현재 인증된 사용자, 없으면 None
    """
    if hasattr(request.state, "user"):
        return request.state.user

    # 사용자 인증 처리
    try:
        user = await get_current_user(request)
        request.state.user = user
        return user
    except Exception as e:
        logger.warning(f"사용자 인증 실패: {str(e)}")
        return None
