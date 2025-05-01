from typing import Generator, Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
from dotenv import load_dotenv

# 상대 경로 임포트로 수정
from .database import get_db
from .services.maintenance import MaintenanceService

# .env 파일 로드
load_dotenv()

# JWT 설정
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 데이터베이스 세션 의존성
def get_db_session() -> Generator[Session, None, None]:
    """데이터베이스 세션 의존성"""
    db = get_db()
    try:
        yield db
    finally:
        db.close()

# 정비 서비스 의존성
def get_maintenance_service(
    db: Annotated[Session, Depends(get_db_session)]
) -> MaintenanceService:
    """정비 서비스 의존성"""
    return MaintenanceService(db)

# JWT 토큰 생성
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """액세스 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # 딕셔너리 union 연산자 사용 (Python 3.9+)
    return jwt.encode(to_encode | {"exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

# JWT 토큰 검증
def verify_token(token: str) -> dict:
    """토큰 검증"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

# 인증 의존성
def get_current_user(token: str = Depends(verify_token)) -> dict:
    """현재 사용자 의존성"""
    return token 