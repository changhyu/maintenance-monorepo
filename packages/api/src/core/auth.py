"""
인증 및 권한 관리 모듈

JWT 토큰 기반 인증 및 권한 관리 기능을 제공합니다.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

from fastapi import Depends, Header, Request, Security, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
    OAuth2PasswordBearer,
)
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from packages.api.src.coreconfig import settings
from packages.api.src.coreexceptions import ForbiddenException, UnauthorizedException
from packages.api.src.corelogger import logger
from packages.api.src.coremodels.token import TokenPayload

# 보안 스키마 설정
security = HTTPBearer(auto_error=False)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class TokenResponse(BaseModel):
    """토큰 응답 모델"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserInfo(BaseModel):
    """사용자 정보 모델"""

    id: str
    username: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: str = "user"
    permissions: List[str] = []
    is_active: bool = True


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:  # sourcery skip: dict-assign-update-to-union
    """
    액세스 토큰 생성

    Args:
        data: 토큰에 포함할 데이터
        expires_delta: 만료 시간

    Returns:
        str: JWT 액세스 토큰
    """
    to_encode = data.copy()

    # 만료 시간 설정
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # 필수 클레임 추가 (딕셔너리 합치기 연산자 사용)
    to_encode = to_encode | {
        "exp": expire.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp(),
        "type": "access",
    }

    # 토큰 인코딩 및 즉시 반환
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:  # sourcery skip: dict-assign-update-to-union
    """
    리프레시 토큰 생성

    Args:
        data: 토큰에 포함할 데이터
        expires_delta: 만료 시간

    Returns:
        str: JWT 리프레시 토큰
    """
    to_encode = data.copy()

    # 리프레시 토큰은 최소한의 정보만 포함
    minimal_data = {
        "sub": to_encode.get("sub"),
        "user_id": to_encode.get("user_id", to_encode.get("sub")),
    }

    # 만료 시간 설정 (일반적으로 액세스 토큰보다 길게 설정)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)  # 기본 7일

    # 필수 클레임 추가 (딕셔너리 합치기 연산자 사용)
    minimal_data = minimal_data | {
        "exp": expire.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp(),
        "type": "refresh",
    }

    # 토큰 인코딩 및 즉시 반환
    return jwt.encode(
        minimal_data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> Dict[str, Any]:
    """
    JWT 토큰 디코딩

    Args:
        token: JWT 토큰

    Returns:
        Dict[str, Any]: 디코딩된 토큰 페이로드

    Raises:
        UnauthorizedException: 토큰이 유효하지 않은 경우
    """
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as e:
        logger.warning(f"JWT 토큰 디코딩 실패: {str(e)}")
        raise UnauthorizedException(detail="유효하지 않은 인증 정보") from e


def refresh_tokens(refresh_token: str) -> TokenResponse:
    """
    리프레시 토큰을 사용하여 새 액세스 토큰 및 리프레시 토큰 발급

    Args:
        refresh_token: 리프레시 토큰

    Returns:
        TokenResponse: 새 액세스 토큰과 리프레시 토큰

    Raises:
        UnauthorizedException: 리프레시 토큰이 유효하지 않은 경우
    """
    try:
        # 토큰 디코딩
        payload = decode_token(refresh_token)

        # 리프레시 토큰인지 확인
        if payload.get("type") != "refresh":
            raise UnauthorizedException(
                detail="액세스 토큰은 갱신에 사용할 수 없습니다"
            )

        # 새 액세스 토큰용 데이터 준비
        # 실제 구현에서는 DB에서 사용자 정보 다시 조회
        user_data = {
            "sub": payload.get("sub"),
            "user_id": payload.get("user_id", payload.get("sub")),
        }

        # 액세스 토큰 및 리프레시 토큰 생성
        access_token = create_access_token(user_data)
        new_refresh_token = create_refresh_token(user_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    except Exception as e:
        logger.error(f"토큰 갱신 실패: {str(e)}")
        raise UnauthorizedException(detail="토큰 갱신 실패") from e


def get_token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    인증 헤더에서 토큰 추출

    Args:
        authorization: Authorization 헤더 값

    Returns:
        Optional[str]: 추출된 토큰 또는 None
    """
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    return token if scheme.lower() == "bearer" else None


def get_token_from_request(request: Request) -> Optional[str]:
    """
    요청 객체에서 토큰 추출

    Args:
        request: 요청 객체

    Returns:
        Optional[str]: 추출된 토큰 또는 None
    """
    auth_header = request.headers.get("Authorization")
    return get_token_from_header(auth_header)


class SecurityService:
    """보안 서비스 클래스"""

    def __init__(self):
        """보안 서비스 초기화"""
        self.logger = logger

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """토큰 검증"""
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except JWTError as e:
            self.logger.error(f"토큰 검증 실패: {str(e)}")
            raise UnauthorizedException(detail="유효하지 않은 토큰")


# 전역 보안 서비스 인스턴스
_security_service = None


def get_security_service() -> SecurityService:
    """보안 서비스 인스턴스 반환"""
    global _security_service
    if _security_service is None:
        _security_service = SecurityService()
    return _security_service


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    security_service: SecurityService = Depends(get_security_service),
) -> str:
    """
    현재 사용자의 JWT 토큰을 검증하고 사용자 ID를 반환합니다.

    Args:
        credentials (HTTPAuthorizationCredentials): HTTP 인증 정보
        security_service (SecurityService): 보안 서비스 인스턴스

    Returns:
        str: 사용자 ID

    Raises:
        HTTPException: 토큰이 유효하지 않거나 만료된 경우
    """
    try:
        payload = await security_service.verify_token(credentials.credentials)
        token_data = TokenPayload(
            sub=payload.get("sub"), exp=datetime.fromtimestamp(payload.get("exp", 0))
        )

        if token_data.exp < datetime.utcnow():
            raise UnauthorizedException(detail="토큰이 만료되었습니다")

        return token_data.sub

    except JWTError as e:
        raise UnauthorizedException(detail="유효하지 않은 토큰")


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[Dict[str, Any]]:
    """
    현재 인증된 사용자 정보 조회 (선택적)

    Args:
        credentials: 인증 정보 (토큰)

    Returns:
        Optional[Dict[str, Any]]: 사용자 정보 또는 None
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        return decode_token(token)
    except Exception:
        return None


def has_permission(required_permissions: List[str] = None):
    """
    특정 권한이 필요한 엔드포인트에 대한 의존성 함수

    Args:
        required_permissions: 필요한 권한 목록

    Returns:
        Callable: 의존성 함수
    """
    if required_permissions is None:
        required_permissions = []

    async def permission_checker(
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        """
        사용자 권한 확인

        Args:
            current_user: 현재 인증된 사용자 정보

        Returns:
            Dict[str, Any]: 사용자 정보 (권한 상태에 따라 추가 정보 포함)

        Raises:
            ForbiddenException: 필요한 권한이 없는 경우
        """
        # 권한 확인 로직
        user_permissions = current_user.get("permissions", [])
        user_role = current_user.get("role", "").lower()

        # 관리자는 모든 권한을 가짐
        if user_role == "admin" or "admin" in user_permissions:
            # 관리자에게는 특별 표시 추가
            return {
                **current_user,
                "_auth_type": "admin_access",
                "_has_full_access": True,
            }

        # 필요한 권한이 있는지 확인
        missing_permissions = [
            permission
            for permission in required_permissions
            if permission not in user_permissions
        ]

        if missing_permissions:
            permission = missing_permissions[0]
            logger.warning(
                f"권한 부족: 사용자 {current_user.get('sub')}에게 {permission} 권한이 없습니다"
            )
            raise ForbiddenException(
                detail=f"이 작업을 수행하기 위한 권한이 부족합니다: {permission}"
            )

        # 일반 권한으로 접근 시 권한 정보 추가
        return {
            **current_user,
            "_auth_type": "permission_based",
            "_granted_permissions": required_permissions,
        }

    return permission_checker


# 역할 기반 접근 제어
def has_role(required_roles: List[str] = None):
    """
    특정 역할이 필요한 엔드포인트에 대한 의존성 함수

    Args:
        required_roles: 필요한 역할 목록

    Returns:
        Callable: 의존성 함수
    """
    if required_roles is None:
        required_roles = []

    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        """
        사용자 역할 확인

        Args:
            current_user: 현재 인증된 사용자 정보

        Returns:
            Dict[str, Any]: 사용자 정보 (역할 상태에 따라 추가 정보 포함)

        Raises:
            ForbiddenException: 필요한 역할이 없는 경우
        """
        user_role = current_user.get("role", "").lower()

        # 관리자는 모든 역할의 작업 수행 가능
        if user_role == "admin":
            # 관리자에게는 특별 표시 추가
            return {
                **current_user,
                "_auth_type": "admin_role",
                "_has_full_access": True,
            }

        # 역할 확인 (필요한 역할이 있고 사용자 역할이 그 중에 없는 경우)
        if required_roles and user_role not in [
            role.lower() for role in required_roles
        ]:
            logger.warning(
                f"역할 부족: 사용자 {current_user.get('sub')}의 역할이 {required_roles}에 포함되지 않습니다"
            )
            raise ForbiddenException(detail="이 작업을 수행하기 위한 역할이 부족합니다")

        # 특정 역할로 접근 시 역할 정보 추가
        matching_role = user_role
        return {
            **current_user,
            "_auth_type": "role_based",
            "_matched_role": matching_role,
            "_required_roles": required_roles,
        }

    return role_checker


# 미들웨어를 위한 유틸리티 함수
async def is_admin_user(request: Request) -> bool:
    """
    요청 사용자가 관리자인지 확인

    Args:
        request: 요청 객체

    Returns:
        bool: 관리자 여부
    """
    token = get_token_from_request(request)
    if not token:
        return False

    try:
        payload = decode_token(token)
        return payload.get("role") == "admin" or "admin" in payload.get(
            "permissions", []
        )
    except Exception:
        return False
