import uuid
import base64
import json
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Union, Any

from ..config.settings import settings

def encode_jwt(payload: Dict[str, Any], secret_key: str, algorithm: str = 'HS256') -> str:
    """JWT 토큰 인코딩 함수"""
    # 헤더 생성
    header = {
        "alg": algorithm,
        "typ": "JWT"
    }
    
    # JSON을 base64로 인코딩
    def b64_encode(data):
        json_str = json.dumps(data).encode('utf-8')
        b64_bytes = base64.urlsafe_b64encode(json_str)
        return b64_bytes.decode('utf-8').rstrip('=')
    
    # 헤더와 페이로드 인코딩
    header_b64 = b64_encode(header)
    payload_b64 = b64_encode(payload)
    
    # 서명 생성
    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    # JWT 토큰 조합
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str, secret_key: str) -> Dict[str, Any]:
    """JWT 토큰 디코딩 함수"""
    # 토큰 분리
    try:
        header_b64, payload_b64, signature_b64 = token.split('.')
    except ValueError:
        raise ValueError("유효하지 않은 토큰 형식입니다")
    
    # JSON 디코딩
    def b64_decode(data):
        # Padding 추가
        padding = '=' * (4 - (len(data) % 4))
        padded = data + padding if padding != '====' else data
        try:
            decoded = base64.urlsafe_b64decode(padded.encode('utf-8'))
            return json.loads(decoded.decode('utf-8'))
        except:
            raise ValueError("토큰 디코딩에 실패했습니다")
    
    # 페이로드 디코딩
    try:
        payload = b64_decode(payload_b64)
    except Exception:
        raise ValueError("페이로드 디코딩에 실패했습니다")
    
    # 만료 시간 검증
    if "exp" in payload:
        exp_timestamp = payload["exp"]
        current_timestamp = datetime.utcnow().timestamp()
        if current_timestamp > exp_timestamp:
            raise ValueError("만료된 토큰입니다")
    
    # Not Before Time 검증
    if "nbf" in payload:
        nbf_timestamp = payload["nbf"]
        current_timestamp = datetime.utcnow().timestamp()
        if current_timestamp < nbf_timestamp:
            raise ValueError("아직 유효하지 않은 토큰입니다")
    
    # 서명 검증 (보안을 위한 상수 시간 비교 필요)
    message = f"{header_b64}.{payload_b64}"
    expected_signature = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode('utf-8').rstrip('=')
    
    if not hmac.compare_digest(signature_b64, expected_signature_b64):
        raise ValueError("서명이 유효하지 않습니다")
    
    return payload

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """액세스 토큰 생성"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 보안을 위한 추가 클레임 포함
    to_encode.update({
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),  # 발급 시간
        "nbf": datetime.utcnow().timestamp(),  # Not Before Time
        "jti": str(uuid.uuid4())   # 고유 토큰 ID (재사용 방지)
    })
    
    # SECRET_KEY 처리 (SecretStr 또는 일반 문자열)
    if settings.SECRET_KEY:
        try:
            # SecretStr 타입인 경우
            secret_key = settings.SECRET_KEY.get_secret_value()
        except AttributeError:
            # 일반 문자열인 경우
            secret_key = settings.SECRET_KEY
    else:
        secret_key = "unsafe_secret_key_please_change"
    
    # 자체 구현 JWT 인코딩 사용
    encoded_jwt = encode_jwt(
        to_encode, 
        secret_key, 
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """리프레시 토큰 생성"""
    refresh_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    data = data.copy()
    
    # 리프레시 토큰에는 특별한 타입 명시
    data.update({"token_type": "refresh"})
    
    return create_access_token(data, expires_delta=refresh_expires)

def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """토큰 검증"""
    try:
        # SECRET_KEY 처리 (SecretStr 또는 일반 문자열)
        if settings.SECRET_KEY:
            try:
                # SecretStr 타입인 경우
                secret_key = settings.SECRET_KEY.get_secret_value()
            except AttributeError:
                # 일반 문자열인 경우
                secret_key = settings.SECRET_KEY
        else:
            secret_key = "unsafe_secret_key_please_change"
        
        # 자체 구현 JWT 디코딩 사용
        payload = decode_jwt(token, secret_key)
        
        # 토큰 유형 검증
        if token_type == "refresh" and payload.get("token_type") != "refresh":
            raise ValueError("리프레시 토큰이 아닙니다")
        elif token_type == "access" and payload.get("token_type") == "refresh":
            raise ValueError("액세스 토큰이 아닙니다")
            
        return payload
    except Exception as e:
        if "만료된 토큰입니다" in str(e):
            raise ValueError("만료된 토큰입니다")
        else:
            raise ValueError(f"유효하지 않은 토큰입니다: {str(e)}")

def revoke_token(token_id: str) -> bool:
    """토큰 취소 (블랙리스트 방식)"""
    # 실제 구현에서는 Redis나 데이터베이스에 토큰 ID를 저장하여 블랙리스트 관리
    # 여기서는 예시만 제공
    
    # 취소된 토큰 목록 (실제 구현에서는 DB나 캐시에 저장)
    revoked_tokens = []
    
    # 토큰 ID를 블랙리스트에 추가
    revoked_tokens.append(token_id)
    
    return True

def is_token_revoked(token_id: str) -> bool:
    """토큰이 취소되었는지 확인"""
    # 실제 구현에서는 Redis나 데이터베이스에서 토큰 ID 존재 여부 확인
    # 여기서는 예시만 제공
    
    # 취소된 토큰 목록 (실제 구현에서는 DB나 캐시에서 조회)
    revoked_tokens = []
    
    return token_id in revoked_tokens 