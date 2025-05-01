"""
Common dependency functions for FastAPI
"""
import logging
from typing import Callable, Awaitable, TypeVar, Optional
from fastapi import Depends, Request, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

logger = logging.getLogger(__name__)

T = TypeVar('T')

# 데이터베이스 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    데이터베이스 세션 가져오기
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# 임시 사용자 정보
class UserInDB:
    def __init__(self, username: str, email: str, disabled: bool = False):
        self.username = username
        self.email = email
        self.disabled = disabled
        self.is_active = not disabled

# 토큰 검증을 위한 더미 데이터
dummy_users_db = {
    "testuser": {
        "username": "testuser",
        "email": "test@example.com",
        "disabled": False,
    }
}

# 공통 종속성 함수들
async def verify_api_key(api_key: str = Depends(lambda r: r.headers.get("X-API-Key"))):
    """
    API 키 검증 종속성 함수
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key"
        )
    
    # TODO: API 키 검증 로직 구현
    if api_key != "test_api_key":  # 테스트용 더미 검증
        logger.warning(f"API 키 검증 실패: {api_key[:5]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return api_key

async def get_current_client(request: Request):
    """
    현재 클라이언트 정보 가져오기
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "Unknown")
    
    return {
        "ip": client_ip,
        "user_agent": user_agent,
        "timestamp": request.scope.get("time", None)
    }

async def rate_limit(request: Request):
    """
    요청 속도 제한 종속성 함수
    """
    # 요청 속도 제한을 위한 실제 구현은 Redis 또는 다른 캐싱 시스템을 사용해야 함
    # 여기서는 간단하게 통과만 시켜줌
    return True

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    현재 사용자 가져오기 (간소화된 버전)
    """
    # 실제로는 토큰을 검증하고 사용자 ID를 추출한 후 DB에서 사용자를 조회해야 함
    # 여기서는 테스트를 위해 항상 testuser를 반환
    user_dict = dummy_users_db.get("testuser")
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserInDB(**user_dict)

async def get_current_active_user(current_user = Depends(get_current_user)):
    """
    활성화된 사용자만 필터링
    """
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user