"""
인증 관련 API 라우터.
로그인, 토큰 관리, 비밀번호 관리, 사용자 정보 조회 등 인증 관련 API 엔드포인트를 포함합니다.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import (APIRouter, Depends, HTTPException, Request, Response,
                     status)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from packagescore.config import settings
from packagescore.security import TOKEN_TYPE_REFRESH, SecurityService
from packagescore.security import authenticate_user as auth_user
from packagescore.security import (get_current_user, get_password_hash,
                                   get_token_from_header, verify_password)
from pydantic import BaseModel, EmailStr

# 라우터 생성
router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
    responses={
        401: {"description": "인증되지 않음"},
        403: {"description": "접근 권한 없음"},
        500: {"description": "서버 내부 오류"},
    },
)


# 데이터 모델
class Token(BaseModel):
    """
    토큰 응답 모델 - 인증 성공 시 반환되는 토큰 정보
    """

    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 3600,
            }
        }


class TokenRefresh(BaseModel):
    """
    토큰 갱신 요청 모델 - 리프레시 토큰을 사용해 새로운 액세스 토큰 요청
    """

    refresh_token: str

    class Config:
        schema_extra = {
            "example": {"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
        }


class UserLogin(BaseModel):
    """
    사용자 로그인 요청 모델
    """

    email: EmailStr
    password: str
    remember_me: bool = False

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "yourpassword",
                "remember_me": True,
            }
        }


class ResetPasswordRequest(BaseModel):
    """
    비밀번호 재설정 요청 모델
    """

    email: EmailStr

    class Config:
        schema_extra = {"example": {"email": "user@example.com"}}


class ResetPasswordConfirm(BaseModel):
    """
    비밀번호 재설정 확인 모델 - 토큰과 새 비밀번호로 재설정
    """

    token: str
    new_password: str

    class Config:
        schema_extra = {
            "example": {
                "token": "reset-token-from-email",
                "new_password": "new-secure-password",
            }
        }


class UserProfile(BaseModel):
    """
    사용자 프로필 정보 모델
    """

    id: str
    email: str
    name: str
    role: str

    class Config:
        schema_extra = {
            "example": {
                "id": "00001",
                "email": "user@example.com",
                "name": "홍길동",
                "role": "CUSTOMER",
            }
        }


class AuthResponse(BaseModel):
    """
    인증 응답 모델 - 토큰과 사용자 정보 포함
    """

    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: UserProfile

    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 3600,
                "user": {
                    "id": "00001",
                    "email": "user@example.com",
                    "name": "홍길동",
                    "role": "CUSTOMER",
                },
            }
        }


# 사용자 목데이터 (실제 구현에서는 데이터베이스로 대체)
MOCK_USERS = {
    "admin@example.com": {
        "id": "00001",
        "email": "admin@example.com",
        "name": "관리자",
        "password": get_password_hash("admin1234"),
        "role": "ADMIN",
        "is_active": True,
        "is_admin": True,
    },
    "tech@example.com": {
        "id": "00002",
        "email": "tech@example.com",
        "name": "정비사",
        "password": get_password_hash("tech1234"),
        "role": "TECHNICIAN",
        "is_active": True,
        "is_admin": False,
    },
    "user@example.com": {
        "id": "00003",
        "email": "user@example.com",
        "name": "사용자",
        "password": get_password_hash("user1234"),
        "role": "CUSTOMER",
        "is_active": True,
        "is_admin": False,
    },
}


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    사용자 인증 함수 (이메일, 비밀번호 검증)

    Args:
        email: 사용자 이메일
        password: 사용자 비밀번호

    Returns:
        인증 성공 시 사용자 정보 딕셔너리, 실패 시 None
    """
    if email not in MOCK_USERS:
        return None
    user = MOCK_USERS[email]
    if not verify_password(password, user["password"]):
        return None
    elif not user["is_active"]:
        return None
    else:
        return user


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="사용자 로그인",
    description="이메일과 비밀번호를 사용하여 로그인하고 액세스/리프레시 토큰을 발급받습니다.",
    responses={
        200: {"description": "로그인 성공, 토큰 및 사용자 정보 반환"},
        401: {"description": "이메일 또는 비밀번호가 올바르지 않음"},
        422: {"description": "유효하지 않은 요청 형식"},
    },
)
async def login(user_login: UserLogin):
    """
    사용자 로그인 - 액세스 토큰 및 리프레시 토큰 발급

    - **email**: 사용자 이메일
    - **password**: 사용자 비밀번호
    - **remember_me**: 장기간 로그인 유지 여부

    Returns:
        토큰 정보와 사용자 프로필 정보가 포함된 응답
    """
    user = authenticate_user(user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 사용자 정보 추출
    user_data = {
        "user_id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "is_active": user["is_active"],
        "is_admin": user["is_admin"],
    }
    # 액세스 토큰 만료 시간 설정
    expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    if user_login.remember_me:
        expires_minutes = settings.EXTENDED_ACCESS_TOKEN_EXPIRE_MINUTES
    # 토큰 생성
    access_token = SecurityService.create_access_token(
        subject=user["email"],
        extra_data=user_data,
        expires_delta=timedelta(minutes=expires_minutes),
    )
    refresh_token = SecurityService.create_refresh_token(
        subject=user["email"], extra_data=user_data
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_minutes * 60,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
    }


@router.post(
    "/token",
    response_model=Token,
    summary="OAuth2 토큰 발급",
    description="OAuth2 표준 폼 형식으로 로그인하여 액세스/리프레시 토큰을 발급받습니다. OAuth2 클라이언트와 호환됩니다.",
    responses={
        200: {"description": "인증 성공, 토큰 발급"},
        401: {"description": "인증 실패"},
    },
)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 호환 토큰 로그인, 폼에서 username은 이메일로 사용.

    - **username**: 사용자 이메일
    - **password**: 사용자 비밀번호

    Returns:
        토큰 정보가 포함된 응답
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 사용자 정보 추출
    user_data = {
        "user_id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "is_active": user["is_active"],
        "is_admin": user["is_admin"],
    }
    # 토큰 생성
    access_token = SecurityService.create_access_token(
        subject=user["email"], extra_data=user_data
    )
    refresh_token = SecurityService.create_refresh_token(
        subject=user["email"], extra_data=user_data
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post(
    "/refresh",
    response_model=Token,
    summary="토큰 갱신",
    description="리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰을 발급합니다.",
    responses={
        200: {"description": "토큰 갱신 성공"},
        400: {"description": "유효하지 않거나 만료된 리프레시 토큰"},
    },
)
async def refresh_token(token_data: TokenRefresh):
    """
    리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰 발급

    - **refresh_token**: 이전에 발급받은 리프레시 토큰

    Returns:
        새로운 액세스 토큰과 리프레시 토큰
    """
    try:
        tokens = SecurityService.refresh_tokens(token_data.refresh_token)
        return {**tokens, "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"토큰 갱신 실패: {str(e)}"
        )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="로그아웃",
    description="현재 사용 중인 토큰을 무효화하여 로그아웃 처리합니다.",
    responses={204: {"description": "로그아웃 성공"}},
)
async def logout(request: Request, response: Response):
    """
    로그아웃 - 토큰 무효화

    현재 사용 중인 JWT 토큰을 블랙리스트에 추가하여 무효화하고 쿠키를 삭제합니다.

    Returns:
        204 No Content
    """
    token = get_token_from_header(request)
    if token:
        SecurityService.logout(token)
    # 쿠키 삭제 (클라이언트에서 쿠키 사용 시)
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return None


@router.post(
    "/password-reset",
    status_code=status.HTTP_202_ACCEPTED,
    summary="비밀번호 재설정 요청",
    description="이메일 주소를 입력하여 비밀번호 재설정 링크를 받습니다.",
    responses={
        202: {
            "description": "비밀번호 재설정 이메일 전송됨 (사용자 존재 여부 공개하지 않음)"
        }
    },
)
async def request_password_reset(request_data: ResetPasswordRequest):
    """
    비밀번호 재설정 요청

    - **email**: 계정에 등록된 이메일 주소

    Returns:
        비밀번호 재설정 이메일 발송 상태 메시지
    """
    email = request_data.email
    # 실제 구현에서는 사용자 존재 여부 확인
    if email not in MOCK_USERS:
        # 보안을 위해 사용자가 존재하지 않아도 동일한 응답 반환
        return {"message": "비밀번호 재설정 링크가 이메일로 전송되었습니다."}
    # 비밀번호 재설정 토큰 생성
    reset_token = SecurityService.generate_password_reset_token(email)
    # 실제 구현에서는 이메일 발송 로직 구현
    # send_password_reset_email(email, reset_token)
    return {"message": "비밀번호 재설정 링크가 이메일로 전송되었습니다."}


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_200_OK,
    summary="비밀번호 재설정 확인",
    description="이메일로 받은 토큰과 새 비밀번호를 사용하여 비밀번호를 재설정합니다.",
    responses={
        200: {"description": "비밀번호 재설정 성공"},
        400: {"description": "유효하지 않거나 만료된 토큰"},
        404: {"description": "사용자를 찾을 수 없음"},
    },
)
async def confirm_password_reset(reset_data: ResetPasswordConfirm):
    """
    비밀번호 재설정 확인 및 변경

    - **token**: 이메일로 받은 비밀번호 재설정 토큰
    - **new_password**: 설정할 새 비밀번호

    Returns:
        비밀번호 재설정 결과 메시지
    """
    # 토큰 확인
    email = SecurityService.verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 만료된 토큰입니다.",
        )
    # 실제 구현에서는 DB에서 사용자 찾아 비밀번호 업데이트
    if email in MOCK_USERS:
        # 비밀번호 해시화 및 업데이트
        MOCK_USERS[email]["password"] = get_password_hash(reset_data.new_password)
        return {"message": "비밀번호가 성공적으로 변경되었습니다."}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다."
        )


@router.get(
    "/me",
    response_model=UserProfile,
    summary="내 프로필 정보",
    description="현재 인증된 사용자의 정보를 조회합니다.",
    responses={
        200: {"description": "프로필 정보 조회 성공"},
        401: {"description": "인증되지 않은 사용자"},
    },
)
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    현재 인증된 사용자 정보 조회

    토큰에서 추출한 현재 인증된 사용자의 정보를 반환합니다.

    Returns:
        현재 로그인한 사용자의 프로필 정보
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
    }


@router.get(
    "/verify",
    summary="토큰 유효성 검증",
    description="제공된 액세스 토큰의 유효성을 검증합니다.",
    responses={
        200: {"description": "유효한 토큰"},
        401: {"description": "유효하지 않은 토큰"},
    },
)
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    토큰 유효성 검증

    현재 제공된 토큰이 유효한지 확인하고 사용자 ID를 반환합니다.

    Returns:
        토큰 유효성 정보와 사용자 ID
    """
    return {"valid": True, "user_id": current_user["id"]}
