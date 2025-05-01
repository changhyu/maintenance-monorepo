"""
테스트를 위한 공통 픽스처 모듈
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# 프로젝트 루트 경로를 sys.path에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.db.base import Base
from backend.db.session import get_db
from backend.core.auth import create_access_token

# 테스트용 데이터베이스 설정
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# 테스트용 세션 생성
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    """테스트용 데이터베이스 픽스처"""
    # 테스트 전에 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    # 테스트용 세션 생성
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        # 테스트 후 세션 롤백 및 종료
        db.rollback()
        db.close()
        # 테이블 삭제
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    """테스트 클라이언트 픽스처"""
    def _get_test_db():
        try:
            yield test_db
        finally:
            pass
    
    # 기존 의존성 오버라이드
    app.dependency_overrides[get_db] = _get_test_db
    
    # 테스트 클라이언트 생성
    with TestClient(app) as client:
        yield client
    
    # 테스트 후 오버라이드 제거
    app.dependency_overrides = {}

@pytest.fixture(scope="function")
def admin_token():
    """관리자 토큰 픽스처"""
    access_token = create_access_token(
        data={"sub": "admin@example.com", "role": "Admin"},
        expires_delta=None
    )
    return access_token

@pytest.fixture(scope="function")
def user_token():
    """일반 사용자 토큰 픽스처"""
    access_token = create_access_token(
        data={"sub": "user@example.com", "role": "User"},
        expires_delta=None
    )
    return access_token

@pytest.fixture(scope="function")
def admin_headers(admin_token):
    """관리자 인증 헤더 픽스처"""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="function")
def user_headers(user_token):
    """일반 사용자 인증 헤더 픽스처"""
    return {"Authorization": f"Bearer {user_token}"}
