"""
인증 관련 API 라우터.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from ..core.config import settings
from ..core.security import (
    get_password_hash, 
    verify_password, 
    get_current_user, 
    authenticate_user as auth_user,
    SecurityService,
    get_token_from_header,
    TOKEN_TYPE_REFRESH
)

# 라우터 생성
router = APIRouter(
    prefix="/api/auth",
    tags=["인증"],
    responses={401: {"description": "인증되지 않음"}},
)

# 데이터 모델
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class TokenRefresh(BaseModel):
    refresh_token: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: UserProfile

# 사용자 목데이터 (실제 구현에서는 데이터베이스로 대체)
MOCK_USERS = {
    "admin@example.com": {
        "id": "00001",
        "email": "admin@example.com",
        "name": "관리자",
        "password": get_password_hash("admin1234"),
        "role": "ADMIN",
        "is_active": True,
        "is_admin": True
    },
    "tech@example.com": {
        "id": "00002",
        "email": "tech@example.com",
        "name": "정비사",
        "password": get_password_hash("tech1234"),
        "role": "TECHNICIAN",
        "is_active": True,
        "is_admin": False
    },
    "user@example.com": {
        "id": "00003",
        "email": "user@example.com",
        "name": "사용자",
        "password": get_password_hash("user1234"),
        "role": "CUSTOMER",
        "is_active": True,
        "is_admin": False
    },
}

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    사용자 인증 (이메일, 비밀번호 검증)
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

@router.post("/login", response_model=AuthResponse)
async def login(user_login: UserLogin):
    """
    사용자 로그인 - 액세스 토큰 및 리프레시 토큰 발급
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
        "is_admin": user["is_admin"]
    }
    
    # 액세스 토큰 만료 시간 설정
    expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    if user_login.remember_me:
        expires_minutes = settings.EXTENDED_ACCESS_TOKEN_EXPIRE_MINUTES
    
    # 토큰 생성
    access_token = SecurityService.create_access_token(
        subject=user["email"],
        extra_data=user_data,
        expires_delta=timedelta(minutes=expires_minutes)
    )
    
    refresh_token = SecurityService.create_refresh_token(
        subject=user["email"],
        extra_data=user_data
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
            "role": user["role"]
        }
    }

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 호환 토큰 로그인, 폼에서 username은 이메일로 사용.
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
        "is_admin": user["is_admin"]
    }
    
    # 토큰 생성
    access_token = SecurityService.create_access_token(
        subject=user["email"],
        extra_data=user_data
    )
    
    refresh_token = SecurityService.create_refresh_token(
        subject=user["email"],
        extra_data=user_data
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh):
    """
    리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰 발급
    """
    try:
        tokens = SecurityService.refresh_tokens(token_data.refresh_token)
        return {
            **tokens,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"토큰 갱신 실패: {str(e)}"
        )

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response):
    """
    로그아웃 - 토큰 무효화
    """
    token = get_token_from_header(request)
    if token:
        SecurityService.logout(token)
    
    # 쿠키 삭제 (클라이언트에서 쿠키 사용 시)
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    
    return None

@router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(request_data: ResetPasswordRequest):
    """
    비밀번호 재설정 요청
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

@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_password_reset(reset_data: ResetPasswordConfirm):
    """
    비밀번호 재설정 확인 및 변경
    """
    # 토큰 확인
    email = SecurityService.verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 만료된 토큰입니다."
        )
    
    # 실제 구현에서는 DB에서 사용자 찾아 비밀번호 업데이트
    if email in MOCK_USERS:
        # 비밀번호 해시화 및 업데이트
        MOCK_USERS[email]["password"] = get_password_hash(reset_data.new_password)
        return {"message": "비밀번호가 성공적으로 변경되었습니다."}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )

@router.get("/me", response_model=UserProfile)
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    현재 인증된 사용자 정보 조회
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"]
    }

@router.get("/verify")
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    토큰 유효성 검증
    """
    return {
        "valid": True,
        "user_id": current_user["id"]
    }