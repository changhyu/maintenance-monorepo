"""
공통 유틸리티 함수 모듈
"""
import logging
import json
import hashlib
import secrets
import string
import bcrypt
import base64
from fastapi import Request, Response, HTTPException, status
from jose import jwt, JWTError
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional, Union
import re

logger = logging.getLogger(__name__)

class CustomJSONEncoder(json.JSONEncoder):
    """날짜와 시간을 ISO 형식으로 직렬화하는 JSON 인코더"""
    
    def default(self, obj: Any) -> Any:
        """객체를 JSON으로 직렬화"""
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def to_dict(obj: Any) -> Dict[str, Any]:
    """객체를 딕셔너리로 변환"""
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    elif hasattr(obj, "dict"):
        return obj.dict()
    elif isinstance(obj, dict):
        return obj
    else:
        return {"value": str(obj)}

def to_json(obj: Any) -> str:
    """객체를 JSON 문자열로 변환"""
    return json.dumps(obj, cls=CustomJSONEncoder)

def validate_license_plate(license_plate: str) -> bool:
    """
    한국 자동차 번호판 형식을 검증
    
    허용 형식:
    - 00가 0000 (구형식)
    - 000가 0000 (신형식)
    - 서울00가 0000 (지역명 포함)
    """
    if not license_plate:
        return False
    
    # 공백 제거 및 대문자 변환
    license_plate = license_plate.replace(" ", "").upper()
    
    # 기본 패턴: 숫자+한글+숫자
    pattern1 = r'^\d{2,3}[가-힣]{1}\d{4}$'
    # 지역명 포함 패턴
    pattern2 = r'^[가-힣]{2}\d{2}[가-힣]{1}\d{4}$'
    
    return bool(re.match(pattern1, license_plate) or re.match(pattern2, license_plate))

def mask_vin(vin: str) -> str:
    """
    차대번호(VIN)을 마스킹 처리
    앞 3자리와 뒤 4자리만 표시
    """
    if not vin or len(vin) < 8:
        return vin
    
    masked_length = len(vin) - 7
    return f"{vin[:3]}{'*' * masked_length}{vin[-4:]}"

def format_currency(amount: float, currency: str = "KRW") -> str:
    """
    금액을 통화 형식으로 포맷팅
    """
    if currency == "KRW":
        return f"₩{amount:,.0f}"
    elif currency == "USD":
        return f"${amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"

def get_maintenance_suggestion(mileage: int, last_maintenance_date: Optional[date] = None) -> Dict[str, Any]:
    """
    주행거리와 마지막 정비일을 기준으로 정비 제안을 생성
    """
    suggestions = []
    current_date = date.today()
    
    # 주행거리 기준 제안
    if mileage >= 10000 and mileage % 10000 <= 500:
        suggestions.append({
            "type": "oil_change",
            "message": "엔진 오일 교체가 필요합니다.",
            "priority": "high"
        })
    
    if mileage >= 20000 and mileage % 20000 <= 1000:
        suggestions.append({
            "type": "brake_check",
            "message": "브레이크 패드 점검이 권장됩니다.",
            "priority": "medium"
        })
    
    if mileage >= 40000 and mileage % 40000 <= 2000:
        suggestions.append({
            "type": "timing_belt",
            "message": "타이밍 벨트 점검이 필요합니다.",
            "priority": "high"
        })
    
    # 날짜 기준 제안
    if last_maintenance_date:
        days_since_maintenance = (current_date - last_maintenance_date).days
        
        if days_since_maintenance > 365:
            suggestions.append({
                "type": "annual_check",
                "message": f"마지막 정비 후 {days_since_maintenance}일이 지났습니다. 연간 점검을 권장합니다.",
                "priority": "high"
            })
    
    return {
        "mileage": mileage,
        "last_maintenance_date": last_maintenance_date.isoformat() if last_maintenance_date else None,
        "suggestions": suggestions
    }

def generate_etag(data: Any) -> str:
    """
    데이터로부터 ETag 해시 값 생성
    """
    if isinstance(data, (dict, list)):
        data_str = json.dumps(data, sort_keys=True, cls=CustomJSONEncoder)
    elif hasattr(data, "dict"):
        data_str = json.dumps(data.dict(), sort_keys=True, cls=CustomJSONEncoder)
    else:
        data_str = str(data)
    
    # MD5 해시 생성 - ETag용으로는 충분
    return hashlib.md5(data_str.encode()).hexdigest()

def get_etag(data: Any) -> str:
    """
    데이터로부터 ETag 생성 (generate_etag와 동일 - 호환성을 위한 별칭)
    """
    return generate_etag(data)

def check_etag(request: Request, response: Response, data: Any) -> bool:
    """
    ETag 기반 캐시 확인
    
    클라이언트가 보낸 If-None-Match와 데이터의 ETag를 비교하여
    데이터가 변경되지 않았다면 304 Not Modified 응답
    
    반환값:
    - True: 클라이언트가 이미 최신 데이터를 가지고 있음
    - False: 클라이언트에게 새 데이터를 전송해야 함
    """
    etag = generate_etag(data)
    response.headers["ETag"] = f'"{etag}"'
    
    if_none_match = request.headers.get("if-none-match")
    if if_none_match:
        if if_none_match.strip('"') == etag:
            response.status_code = 304  # Not Modified
            return True
    
    return False

def paginate_list(items: List[Any], skip: int = 0, limit: int = 100) -> Dict[str, Any]:
    """
    리스트를 페이지네이션 처리하여 반환
    
    Args:
        items: 원본 아이템 목록
        skip: 건너뛸 아이템 수
        limit: 한 페이지에 표시할 최대 아이템 수
        
    Returns:
        페이지네이션 정보가 포함된 딕셔너리
    """
    total = len(items)
    paginated_items = items[skip:skip + limit]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": paginated_items
    }

# 보안 관련 유틸리티 함수 추가
def generate_password(length: int = 12) -> str:
    """
    지정된 길이의 안전한 랜덤 비밀번호 생성
    """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password: str) -> str:
    """
    비밀번호를 안전하게 해싱
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해싱된 비밀번호 비교
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(data: dict, secret_key: str, expires_delta: timedelta, algorithm: str = "HS256") -> str:
    """
    JWT 토큰 생성
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt

def verify_token(token: str, secret_key: str, algorithm: str = "HS256") -> Dict[str, Any]:
    """
    JWT 토큰 검증 및 페이로드 반환
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

def sanitize_input(text: str) -> str:
    """
    XSS 방지를 위한 입력 문자열 정화
    """
    if not text:
        return ""
    # HTML 태그 제거 및 특수문자 이스케이프
    replacements = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text

def validate_cors_origin(origin: str, allowed_origins: List[str]) -> bool:
    """
    CORS 요청의 출처 검증
    """
    if not origin:
        return False
    
    if "*" in allowed_origins:
        return True
    
    return origin in allowed_origins

def generate_csrf_token() -> str:
    """
    CSRF 토큰 생성
    """
    return secrets.token_hex(32)

def set_secure_headers(response: Response) -> None:
    """
    보안 HTTP 헤더 설정
    """
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    }
    
    for key, value in headers.items():
        response.headers[key] = value

def rate_limit_check(client_ip: str, rate_limit_store: Dict[str, Dict[str, Any]], max_requests: int = 100, window_seconds: int = 60) -> bool:
    """
    IP 기반 요청 속도 제한 확인
    """
    now = datetime.now()
    
    if client_ip not in rate_limit_store:
        rate_limit_store[client_ip] = {
            "count": 1,
            "reset_at": now + timedelta(seconds=window_seconds)
        }
        return True
    
    client_data = rate_limit_store[client_ip]
    
    # 시간 창이 만료되었는지 확인
    if now >= client_data["reset_at"]:
        client_data["count"] = 1
        client_data["reset_at"] = now + timedelta(seconds=window_seconds)
        return True
    
    # 요청 한도 확인
    if client_data["count"] >= max_requests:
        return False
    
    client_data["count"] += 1
    return True

def log_security_event(event_type: str, details: Dict[str, Any], severity: str = "info") -> None:
    """
    보안 관련 이벤트 로깅
    """
    event_data = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        "severity": severity,
        "details": details
    }
    
    if severity == "critical":
        logger.critical(f"보안 이벤트: {json.dumps(event_data, cls=CustomJSONEncoder)}")
    elif severity == "error":
        logger.error(f"보안 이벤트: {json.dumps(event_data, cls=CustomJSONEncoder)}")
    elif severity == "warning":
        logger.warning(f"보안 이벤트: {json.dumps(event_data, cls=CustomJSONEncoder)}")
    else:
        logger.info(f"보안 이벤트: {json.dumps(event_data, cls=CustomJSONEncoder)}")