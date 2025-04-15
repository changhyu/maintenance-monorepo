"""
인증 및 보안 관련 단위 테스트.
"""
import pytest
import time
from datetime import datetime, timedelta
from jose import jwt

from packages.api.src.core.config import settings
from packages.api.src.core.security import (
    create_access_token,
    create_refresh_token,
    verify_and_decode_token,
    blacklist_token,
    is_token_blacklisted,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH
)

# 테스트 환경 설정
@pytest.fixture
def user_data():
    return {
        "user_id": "test123",
        "email": "test@example.com",
        "name": "Test User",
        "role": "user",
        "is_active": True,
        "is_admin": False
    }

# 액세스 토큰 생성 테스트
def test_create_access_token(user_data):
    token = create_access_token(
        subject=user_data["email"],
        extra_data={
            "user_id": user_data["user_id"],
            "name": user_data["name"],
            "role": user_data["role"]
        }
    )
    
    # 토큰 검증
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM]
    )
    
    assert payload["sub"] == user_data["email"]
    assert payload["user_id"] == user_data["user_id"]
    assert payload["name"] == user_data["name"]
    assert payload["role"] == user_data["role"]
    assert payload["token_type"] == TOKEN_TYPE_ACCESS

# 리프레시 토큰 생성 테스트
def test_create_refresh_token(user_data):
    token = create_refresh_token(
        subject=user_data["email"],
        extra_data={
            "user_id": user_data["user_id"],
            "role": user_data["role"]
        }
    )
    
    # 토큰 검증
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM]
    )
    
    assert payload["sub"] == user_data["email"]
    assert payload["user_id"] == user_data["user_id"]
    assert payload["role"] == user_data["role"]
    assert payload["token_type"] == TOKEN_TYPE_REFRESH

# 토큰 만료 테스트
def test_token_expiry():
    # 이미 만료된 토큰 생성
    expired_token = create_access_token(
        subject="test@example.com", 
        expires_delta=timedelta(seconds=-1)
    )
    
    # 검증은 예외가 발생해야 함
    with pytest.raises(Exception):
        verify_and_decode_token(expired_token, TOKEN_TYPE_ACCESS)
    
    # 유효한 토큰 생성
    valid_token = create_access_token(
        subject="test@example.com", 
        expires_delta=timedelta(minutes=5)
    )
    
    # 검증은 성공해야 함
    payload = verify_and_decode_token(valid_token, TOKEN_TYPE_ACCESS)
    assert payload["sub"] == "test@example.com"
    assert payload["token_type"] == TOKEN_TYPE_ACCESS

# 토큰 타입 검증 테스트
def test_token_type_validation():
    # 액세스 토큰 생성
    access_token = create_access_token(subject="test@example.com")
    
    # 틀린 타입으로 검증
    with pytest.raises(Exception):
        verify_and_decode_token(access_token, TOKEN_TYPE_REFRESH)
    
    # 올바른 타입으로 검증
    payload = verify_and_decode_token(access_token, TOKEN_TYPE_ACCESS)
    assert payload["sub"] == "test@example.com"

# 토큰 블랙리스트 테스트
def test_token_blacklist(user_data):
    # 토큰 생성
    token = create_access_token(subject=user_data["email"])
    
    # 디코딩
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM]
    )
    
    # 블랙리스트에 없어야 함
    assert not is_token_blacklisted(payload["jti"])
    
    # 블랙리스트에 추가
    assert blacklist_token(payload, 60)  # 60초 동안 블랙리스트 유지
    
    # 블랙리스트에 있어야 함
    assert is_token_blacklisted(payload["jti"])
    
    # 블랙리스트된 토큰으로 검증하면 실패해야 함
    with pytest.raises(Exception):
        verify_and_decode_token(token, TOKEN_TYPE_ACCESS)