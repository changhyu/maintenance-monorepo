"""
인증 및 보안 관련 유틸리티.
"""

import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from functools import lru_cache, partial
from typing import (Any, Callable, Dict, Generic, List, Optional, Protocol,
                    Set, Tuple, TypeVar, Union, runtime_checkable)

import bcrypt  # 직접 bcrypt 모듈 추가
import msgpack
import pyotp
import structlog
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from prometheus_client import REGISTRY, Counter, Histogram
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from packages.api.src.corecache import CacheManager, get_cache_manager
from packages.api.src.coreconfig import settings
from packages.api.src.coredatabase import SessionLocal, get_session
from packages.api.src.coredatabase.models import User
from packages.api.src.coremetrics import (record_token_blacklisted,
                                          record_token_created,
                                          record_token_refreshed)
from packages.api.src.coremetrics_collector import metrics_collector
from packages.api.src.coremodels.token import TokenPayload

# 로거 설정
logger = structlog.get_logger()

# 패스워드 해싱을 위한 CryptContext 설정
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# 기존 CryptContext 주석 처리


def get_password_hash(password: str) -> str:
    """
    비밀번호를 해시화합니다.

    Args:
        password: 해시화할 비밀번호

    Returns:
        str: 해시화된 비밀번호
    """
    # return pwd_context.hash(password)
    # 직접 bcrypt 사용
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt)
    return hashed_password.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    비밀번호를 검증합니다.

    Args:
        plain_password: 검증할 비밀번호
        hashed_password: 해시화된 비밀번호

    Returns:
        bool: 비밀번호가 일치하면 True, 아니면 False
    """
    # return pwd_context.verify(plain_password, hashed_password)
    # 직접 bcrypt 사용
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


async def authenticate_user(
    username: str, password: str, db: Session
) -> Optional[User]:
    """
    사용자를 인증합니다.

    Args:
        username: 사용자 이름
        password: 비밀번호
        db: 데이터베이스 세션

    Returns:
        Optional[User]: 인증된 사용자 객체 또는 None
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


T = TypeVar("T")

# 자주 사용되는 상수 정의
ERROR_2FA_NOT_CONFIGURED = "2FA가 구성되지 않았습니다"
ERROR_2FA_NOT_ENABLED = "2FA가 활성화되어 있지 않습니다"

# 토큰 유형 상수 정의
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"
TOKEN_TYPE_RESET = "reset"
TOKEN_TYPE_BACKUP = "backup"


class Result(Generic[T]):
    """결과 래퍼 클래스"""

    def __init__(
        self, success: bool, data: Optional[T] = None, error: Optional[str] = None
    ):
        self.success = success
        self.data = data
        self.error = error

    @classmethod
    def ok(cls, data: T) -> "Result[T]":
        """성공 결과 생성"""
        return cls(True, data=data)

    @classmethod
    def fail(cls, error: str) -> "Result[T]":
        """실패 결과 생성"""
        return cls(False, error=error)

    def unwrap(self) -> T:
        """데이터 추출 (실패 시 예외 발생)"""
        if not self.success:
            raise ValueError(self.error)
        return self.data

    def unwrap_or(self, default: T) -> T:
        """데이터 추출 (실패 시 기본값 반환)"""
        return self.data if self.success else default

    def map(self, func: Callable[[T], Any]) -> "Result[Any]":
        """결과 변환"""
        return Result.ok(func(self.data)) if self.success else Result.fail(self.error)

    def and_then(self, func: Callable[[T], "Result[Any]"]) -> "Result[Any]":
        """결과 체이닝"""
        return func(self.data) if self.success else Result.fail(self.error)


# 인터페이스 정의 (Protocols)
@runtime_checkable
class CacheInterface(Protocol):
    """캐시 인터페이스"""

    def get(self, key: str) -> Any: ...
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool: ...
    def delete(self, key: str) -> bool: ...
    def exists(self, key: str) -> bool: ...


@runtime_checkable
class TokenInterface(Protocol):
    """토큰 인터페이스"""

    def create_token(
        self, subject: Any, token_type: str, extra_data: Optional[Dict[str, Any]] = None
    ) -> Result[str]: ...
    def verify_token(
        self, token: str, expected_type: Optional[str] = None
    ) -> Result[Dict[str, Any]]: ...
    def blacklist(self, payload: Dict[str, Any]) -> Result[bool]: ...


@runtime_checkable
class PasswordInterface(Protocol):
    """패스워드 인터페이스"""

    def verify(self, plain_password: str, hashed_password: str) -> bool: ...
    def hash(self, password: str) -> Result[str]: ...
    def validate(
        self, password: str, user_history: Optional[List[str]] = None
    ) -> Result[bool]: ...


@runtime_checkable
class SessionInterface(Protocol):
    """세션 인터페이스"""

    def create_session(
        self, user_id: str, token_jti: str, expires_in: int
    ) -> Result[bool]: ...
    def validate_session(self, user_id: str, token_jti: str) -> Result[bool]: ...
    def invalidate_session(self, user_id: str, token_jti: str) -> Result[bool]: ...
    def invalidate_all_sessions(self, user_id: str) -> Result[bool]: ...


class SecurityMetrics:
    """보안 관련 메트릭스"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            # 테스트 환경에서는 메트릭을 비활성화
            if os.environ.get("TESTING") == "true":
                self.token_operations = DummyHistogram()
            else:
                self.token_operations = Histogram(
                    "token_operations_seconds",
                    "Token operation duration",
                    ["operation_type"],
                )
            self._initialized = True


class DummyHistogram:
    """테스트 환경용 더미 히스토그램"""

    def observe(self, value, operation_type="unknown"):
        pass

    def time(self):
        class DummyTimer:
            def __enter__(self):
                pass

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        return DummyTimer()


# 테스트 환경 설정
os.environ["TESTING"] = "true"

# 싱글톤 인스턴스 생성
security_metrics = SecurityMetrics()

# 토큰 타입 상수 정의
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"
TOKEN_TYPE_RESET = "reset"
TOKEN_TYPE_BACKUP = "backup"


class TokenType(str, Enum):
    """토큰 타입 열거형"""

    ACCESS = TOKEN_TYPE_ACCESS
    REFRESH = TOKEN_TYPE_REFRESH
    RESET = TOKEN_TYPE_RESET
    BACKUP = TOKEN_TYPE_BACKUP  # 2FA 백업 토큰용


class CacheKeyPrefix(str, Enum):
    """캐시 키 접두사 열거형"""

    TOKEN_BLACKLIST = "token:blacklist:"
    USER_SESSION = "user:session:"
    RATE_LIMIT = "rate:limit:"
    USED_TOKENS = "token:used:"
    PASSWORD_HISTORY = "password:history:"


class TokenValidationError(Exception):
    """토큰 검증 예외"""

    def __init__(self, error_type: str, message: str):
        self.error_type = error_type
        self.message = message
        super().__init__(f"{error_type}: {message}")


class SessionManager:
    """세션 관리 클래스"""

    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
        self.logger = logger.bind(service="session_manager")
        self.metrics = security_metrics

    def get_cache_key(self, user_id: str) -> str:
        """세션 캐시 키 생성"""
        return f"app:session:{user_id}"

    def create_session(
        self, user_id: str, token_jti: str, expires_in: int
    ) -> Result[bool]:
        """세션 생성"""
        try:
            with self.metrics.token_operations.labels("create_session").time():
                cache_key = self.get_cache_key(user_id)
                active_sessions = self.cache_manager.get(cache_key) or set()

                if isinstance(active_sessions, str):
                    active_sessions = {active_sessions}

                active_sessions.add(token_jti)
                success = self.cache_manager.set(cache_key, active_sessions, expires_in)

                if success:
                    self.logger.info(
                        "session_created", user_id=user_id, token_jti=token_jti
                    )
                    return Result.ok(True)
                return Result.fail("세션 생성 실패")

        except Exception as e:
            self.logger.error("session_creation_failed", error=str(e), user_id=user_id)
            return Result.fail(f"세션 생성 중 오류 발생: {str(e)}")

    def validate_session(self, user_id: str, token_jti: str) -> Result[bool]:
        """세션 유효성 검증"""
        try:
            with self.metrics.token_operations.labels("validate_session").time():
                cache_key = self.get_cache_key(user_id)
                active_sessions = self.cache_manager.get(cache_key)

                if not active_sessions:
                    return Result.fail("세션이 존재하지 않습니다")

                if isinstance(active_sessions, str):
                    active_sessions = {active_sessions}

                is_valid = token_jti in active_sessions

                if not is_valid:
                    self.logger.warning(
                        "invalid_session", user_id=user_id, token_jti=token_jti
                    )
                    return Result.fail("유효하지 않은 세션입니다")

                return Result.ok(True)

        except Exception as e:
            self.logger.error(
                "session_validation_failed", error=str(e), user_id=user_id
            )
            return Result.fail(f"세션 검증 중 오류 발생: {str(e)}")

    def invalidate_session(self, user_id: str, token_jti: str) -> Result[bool]:
        """세션 무효화"""
        try:
            with self.metrics.token_operations.labels("invalidate_session").time():
                cache_key = self.get_cache_key(user_id)
                active_sessions = self.cache_manager.get(cache_key)

                if not active_sessions:
                    return Result.ok(True)  # 이미 세션이 없음

                if isinstance(active_sessions, str):
                    active_sessions = {active_sessions}

                if token_jti in active_sessions:
                    active_sessions.remove(token_jti)
                    success = self.cache_manager.set(cache_key, active_sessions)

                    if success:
                        self.logger.info(
                            "session_invalidated", user_id=user_id, token_jti=token_jti
                        )
                        return Result.ok(True)

                return Result.fail("세션 무효화 실패")

        except Exception as e:
            self.logger.error(
                "session_invalidation_failed", error=str(e), user_id=user_id
            )
            return Result.fail(f"세션 무효화 중 오류 발생: {str(e)}")

    def invalidate_all_sessions(self, user_id: str) -> Result[bool]:
        """모든 세션 무효화"""
        try:
            with self.metrics.token_operations.labels("invalidate_all_sessions").time():
                cache_key = self.get_cache_key(user_id)
                success = self.cache_manager.delete(cache_key)

                if success:
                    self.logger.info("all_sessions_invalidated", user_id=user_id)
                    return Result.ok(True)

                return Result.fail("모든 세션 무효화 실패")

        except Exception as e:
            self.logger.error(
                "all_sessions_invalidation_failed", error=str(e), user_id=user_id
            )
            return Result.fail(f"모든 세션 무효화 중 오류 발생: {str(e)}")


class TokenManager:
    """토큰 관리 클래스"""

    EXPIRY = {
        TokenType.ACCESS: lambda: timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
        TokenType.REFRESH: lambda: timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        TokenType.RESET: lambda: timedelta(
            hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        ),
        TokenType.BACKUP: lambda: timedelta(minutes=15),  # 백업 코드는 15분만 유효
    }

    def __init__(self, cache_manager: CacheManager, session_manager: SessionManager):
        self.cache_manager = cache_manager
        self.session_manager = session_manager
        self.logger = logger.bind(service="token_manager")
        self.metrics = security_metrics

    def create_payload(
        self,
        subject: Union[str, Any],
        token_type: TokenType,
        expires_delta: Optional[timedelta] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """토큰 페이로드 생성"""
        now = datetime.now(timezone.UTC)

        if expires_delta is None:
            expires_delta = self.EXPIRY.get(token_type, lambda: timedelta(minutes=15))()

        jti = str(uuid.uuid4())
        base_payload = {
            "sub": str(subject),
            "token_type": token_type,
            "iat": now,
            "jti": jti,
            "exp": now + expires_delta,
            "nbf": now,  # Not Before 클레임 추가
        }

        return base_payload | (extra_data or {})

    def create_token(
        self,
        subject: Union[str, Any],
        token_type: TokenType,
        extra_data: Optional[Dict[str, Any]] = None,
        expires_delta: Optional[timedelta] = None,
    ) -> Result[str]:
        """토큰 생성"""
        try:
            with self.metrics.token_operations.labels("create_token").time():
                payload = self.create_payload(
                    subject, token_type, expires_delta, extra_data
                )
                token = jwt.encode(
                    payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
                )

                # 액세스 토큰인 경우 세션 생성
                if token_type == TokenType.ACCESS:
                    expires_in = int((payload["exp"] - payload["iat"]).total_seconds())
                    session_result = self.session_manager.create_session(
                        str(subject), payload["jti"], expires_in
                    )
                    if not session_result.success:
                        return Result.fail(session_result.error or "세션 생성 실패")

                record_token_created()
                self.logger.info(
                    "token_created",
                    subject=str(subject),
                    token_type=token_type,
                    jti=payload["jti"],
                )
                return Result.ok(token)

        except Exception as e:
            self.logger.error(
                "token_creation_failed",
                error=str(e),
                subject=str(subject),
                token_type=token_type,
            )
            return Result.fail(f"토큰 생성 중 오류 발생: {str(e)}")

    def decode_token(self, token: str) -> Result[Dict[str, Any]]:
        """토큰 디코딩"""
        try:
            with self.metrics.token_operations.labels("decode_token").time():
                payload = jwt.decode(
                    token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
                )
                return Result.ok(payload)
        except JWTError as e:
            self.logger.warning("token_decode_failed", error=str(e))
            return Result.fail("유효하지 않은 토큰")

    def _validate_token_claims(self, payload: Dict[str, Any]) -> Result[bool]:
        """토큰 클레임 검증"""
        try:
            required_claims = {"sub", "exp", "iat", "jti", "token_type", "nbf"}
            missing_claims = required_claims - set(payload.keys())

            if missing_claims:
                raise TokenValidationError(
                    "missing_claims", f"필수 클레임 누락: {missing_claims}"
                )

            now = datetime.now(timezone.UTC)

            # NBF (Not Before) 검증
            if now.timestamp() < payload["nbf"]:
                raise TokenValidationError(
                    "token_not_valid_yet", "토큰이 아직 유효하지 않음"
                )

            # 만료 시간 검증
            if now.timestamp() >= payload["exp"]:
                raise TokenValidationError("token_expired", "만료된 토큰")

            return Result.ok(True)

        except TokenValidationError as e:
            self.logger.warning(
                "token_validation_failed", error_type=e.error_type, error=e.message
            )
            return Result.fail(e.message)

    def verify_token(
        self,
        token: str,
        expected_type: Optional[TokenType] = None,
        validate_claims: bool = True,
        validate_session: bool = True,
    ) -> Result[Dict[str, Any]]:
        """토큰 검증"""
        try:
            with self.metrics.token_operations.labels("verify_token").time():
                # 토큰 디코딩
                decode_result = self.decode_token(token)
                if not decode_result.success:
                    return decode_result

                payload = decode_result.data

                # 클레임 검증
                if validate_claims:
                    claims_result = self._validate_token_claims(payload)
                    if not claims_result.success:
                        return Result.fail(claims_result.error)

                # 토큰 타입 검증
                if expected_type and payload["token_type"] != expected_type:
                    return Result.fail(f"잘못된 토큰 타입: {payload['token_type']}")

                # 블랙리스트 확인
                if self.is_blacklisted(payload):
                    return Result.fail("무효화된 토큰")

                # 세션 검증
                if validate_session and payload["token_type"] == TokenType.ACCESS:
                    session_result = self.session_manager.validate_session(
                        payload["sub"], payload["jti"]
                    )
                    if not session_result.success:
                        return session_result

                return Result.ok(payload)

        except Exception as e:
            self.logger.error("token_verification_failed", error=str(e))
            return Result.fail(f"토큰 검증 중 오류 발생: {str(e)}")

    def is_blacklisted(self, payload: Dict[str, Any]) -> bool:
        """토큰 블랙리스트 확인"""
        cache_key = self.cache_manager.get_cache_key(
            CacheKeyPrefix.TOKEN_BLACKLIST, payload["jti"]
        )
        return bool(self.cache_manager.get(cache_key))

    def blacklist(
        self, payload: Dict[str, Any], expires_in: Optional[int] = None
    ) -> Result[bool]:
        """토큰 블랙리스트 추가"""
        try:
            if expires_in is None:
                # 토큰 만료시간 기반으로 TTL 설정
                exp = datetime.fromtimestamp(payload["exp"], timezone.UTC)
                now = datetime.now(timezone.UTC)
                expires_in = max(0, int((exp - now).total_seconds()))

            cache_key = self.cache_manager.get_cache_key(
                CacheKeyPrefix.TOKEN_BLACKLIST, payload["jti"]
            )
            success = self.cache_manager.set(cache_key, "1", expires_in)

            if success:
                record_token_blacklisted()
                self.logger.info(
                    "token_blacklisted", jti=payload["jti"], subject=payload["sub"]
                )
                return Result.ok(True)
            return Result.fail("토큰 블랙리스트 추가 실패")

        except Exception as e:
            self.logger.error(
                "token_blacklist_failed", error=str(e), jti=payload.get("jti")
            )
            return Result.fail(f"토큰 블랙리스트 추가 중 오류 발생: {str(e)}")


class PasswordPolicy:
    """패스워드 정책 클래스"""

    def __init__(
        self,
        min_length: int = 8,
        max_length: int = 128,
        require_uppercase: bool = True,
        require_lowercase: bool = True,
        require_numbers: bool = True,
        require_special_chars: bool = True,
        max_consecutive_chars: int = 2,
        previous_passwords_count: int = 3,
        prevent_common_passwords: bool = True,
    ):
        self.min_length = min_length
        self.max_length = max_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_numbers = require_numbers
        self.require_special_chars = require_special_chars
        self.max_consecutive_chars = max_consecutive_chars
        self.previous_passwords_count = previous_passwords_count
        self.prevent_common_passwords = prevent_common_passwords
        self.logger = logger.bind(service="password_policy")

    def validate(
        self, password: str, user_history: Optional[List[str]] = None
    ) -> Result[bool]:
        """패스워드 유효성 검증"""
        try:
            if not self.min_length <= len(password) <= self.max_length:
                return Result.fail(
                    f"비밀번호는 {self.min_length}자 이상 {self.max_length}자 이하여야 합니다"
                )

            if self.require_uppercase and not re.search(r"[A-Z]", password):
                return Result.fail("대문자가 포함되어야 합니다")

            if self.require_lowercase and not re.search(r"[a-z]", password):
                return Result.fail("소문자가 포함되어야 합니다")

            if self.require_numbers and not re.search(r"\d", password):
                return Result.fail("숫자가 포함되어야 합니다")

            if self.require_special_chars and not re.search(
                r'[!@#$%^&*(),.?":{}|<>]', password
            ):
                return Result.fail("특수문자가 포함되어야 합니다")

            if self._has_consecutive_chars(password):
                return Result.fail(
                    f"연속된 문자가 {self.max_consecutive_chars}개를 초과할 수 없습니다"
                )

            if user_history and self._is_in_history(password, user_history):
                return Result.fail(
                    f"최근 {self.previous_passwords_count}개의 비밀번호는 재사용할 수 없습니다"
                )

            if self.prevent_common_passwords and self._is_common_password(password):
                return Result.fail("일반적으로 사용되는 비밀번호는 사용할 수 없습니다")

            return Result.ok(True)

        except Exception as e:
            self.logger.error("password_validation_failed", error=str(e))
            return Result.fail("비밀번호 검증 중 오류 발생")

    def _has_consecutive_chars(self, password: str) -> bool:
        """연속된 문자 검사"""
        return any(
            len(set(password[i : i + self.max_consecutive_chars])) == 1
            for i in range(len(password) - self.max_consecutive_chars + 1)
        )

    def _is_in_history(self, password: str, history: List[str]) -> bool:
        """비밀번호 히스토리 검사"""
        return password in history[-self.previous_passwords_count :]

    def _is_common_password(self, password: str) -> bool:
        """일반적인 비밀번호 검사"""
        # TODO: 일반적인 비밀번호 데이터베이스 구현
        common_passwords = {"password", "123456", "qwerty", "admin"}
        return password.lower() in common_passwords


class TwoFactorAuth:
    """2FA 인증 클래스"""

    def __init__(
        self,
        secret_key: Optional[str] = None,
        backup_codes_count: int = 8,
        backup_code_length: int = 8,
    ):
        self.secret_key = secret_key or self.generate_secret()
        self.backup_codes_count = backup_codes_count
        self.backup_code_length = backup_code_length
        self.totp = pyotp.TOTP(self.secret_key)
        self.logger = logger.bind(service="two_factor_auth")

    def generate_secret(self) -> str:
        """비밀 키 생성"""
        return pyotp.random_base32()

    def get_provisioning_uri(self, username: str, issuer: str = "MyApp") -> str:
        """프로비저닝 URI 생성"""
        return self.totp.provisioning_uri(name=username, issuer_name=issuer)

    def verify_code(self, code: str, valid_window: int = 1) -> bool:
        """TOTP 코드 검증"""
        try:
            return self.totp.verify(code, valid_window=valid_window)
        except Exception as e:
            self.logger.error("totp_verification_failed", error=str(e))
            return False

    def generate_backup_codes(self) -> List[str]:
        """백업 코드 생성"""
        return [
            str(uuid.uuid4())[: self.backup_code_length]
            for _ in range(self.backup_codes_count)
        ]

    def verify_backup_code(
        self, code: str, stored_codes: List[str]
    ) -> Tuple[bool, List[str]]:
        """백업 코드 검증"""
        if code in stored_codes:
            # 사용된 백업 코드 제거
            remaining_codes = [c for c in stored_codes if c != code]
            return True, remaining_codes
        return False, stored_codes


class PasswordManager:
    """패스워드 관리 클래스"""

    def __init__(
        self,
        policy: Optional[PasswordPolicy] = None,
        cache_manager: Optional[CacheManager] = None,
    ):
        self.policy = policy or PasswordPolicy()
        self.cache_manager = cache_manager
        self.pwd_context = CryptContext(
            schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12
        )
        self.logger = logger.bind(service="password_manager")

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        try:
            return self.pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            self.logger.error("password_verification_failed", error=str(e))
            return False

    def hash(self, password: str) -> Result[str]:
        """비밀번호 해시"""
        try:
            return Result.ok(self.pwd_context.hash(password))
        except Exception as e:
            self.logger.error("password_hashing_failed", error=str(e))
            return Result.fail("비밀번호 해시 생성 실패")

    async def add_to_history(self, user_id: str, hashed_password: str) -> Result[bool]:
        """비밀번호 히스토리 추가"""
        if not self.cache_manager:
            return Result.ok(True)

        try:
            cache_key = self.cache_manager.get_cache_key(
                CacheKeyPrefix.PASSWORD_HISTORY, user_id
            )
            history = self.cache_manager.get(cache_key) or []

            if isinstance(history, bytes):
                history = self.cache_manager.deserialize(history)

            history.append(hashed_password)
            history = history[-self.policy.previous_passwords_count :]

            success = self.cache_manager.set(
                cache_key, self.cache_manager.serialize(history)
            )

            return Result.ok(success)

        except Exception as e:
            self.logger.error(
                "password_history_update_failed", error=str(e), user_id=user_id
            )
            return Result.fail("비밀번호 히스토리 업데이트 실패")

    async def get_history(self, user_id: str) -> Result[List[str]]:
        """비밀번호 히스토리 조회"""
        if not self.cache_manager:
            return Result.ok([])

        try:
            cache_key = self.cache_manager.get_cache_key(
                CacheKeyPrefix.PASSWORD_HISTORY, user_id
            )
            history = self.cache_manager.get(cache_key) or []

            if isinstance(history, bytes):
                history = self.cache_manager.deserialize(history)

            return Result.ok(history)

        except Exception as e:
            self.logger.error(
                "password_history_fetch_failed", error=str(e), user_id=user_id
            )
            return Result.fail("비밀번호 히스토리 조회 실패")


class SecurityService:
    """보안 서비스 클래스"""

    def __init__(
        self,
        token_manager: TokenManager,
        password_manager: PasswordManager,
        session_manager: SessionManager,
        two_factor_auth: Optional[TwoFactorAuth] = None,
        cache_manager: Optional[CacheManager] = None,
    ):
        self.token_manager = token_manager
        self.password_manager = password_manager
        self.session_manager = session_manager
        self.two_factor_auth = two_factor_auth or TwoFactorAuth()
        self.cache_manager = cache_manager or CacheManager()
        self.logger = structlog.get_logger()
        self.metrics = security_metrics
        self.sensitive_operations = {
            "change_password",
            "disable_2fa",
            "update_profile",
            "delete_account",
        }

        # 보안 설정
        self.max_login_attempts = 5
        self.lockout_duration = 30  # 분
        self.session_timeout = 30  # 분
        self.require_2fa_for_sensitive_ops = True
        self.password_expiry_days = 90

    async def is_operation_sensitive(self, operation: str) -> bool:
        """특정 작업이 민감한 작업인지 확인"""
        return operation in self.sensitive_operations

    async def verify_operation_security(
        self, user: User, operation: str, two_factor_code: Optional[str] = None
    ) -> Result[bool]:
        """민감한 작업 수행 전 보안 검증"""
        try:
            if not await self.is_operation_sensitive(operation):
                return Result.ok(True)

            if self.require_2fa_for_sensitive_ops and not user.two_factor_enabled:
                return Result.fail("이 작업을 수행하려면 2FA를 활성화해야 합니다")

            if two_factor_code and user.two_factor_enabled:
                if not self.two_factor_auth.verify_code(two_factor_code):
                    return Result.fail("잘못된 2FA 코드")

            return Result.ok(True)

        except Exception as e:
            self.logger.error("operation_security_check_failed", error=str(e))
            return Result.fail("보안 검증 실패")

    async def check_password_expiry(self, user: User) -> Result[bool]:
        """비밀번호 만료 여부 확인"""
        try:
            if not user.last_password_change:
                return Result.ok(True)

            days_since_change = (
                datetime.now(timezone.utc) - user.last_password_change
            ).days
            if days_since_change > self.password_expiry_days:
                return Result.fail(
                    "비밀번호가 만료되었습니다. 새 비밀번호로 변경해주세요."
                )

            return Result.ok(True)

        except Exception as e:
            self.logger.error("password_expiry_check_failed", error=str(e))
            return Result.fail("비밀번호 만료 확인 실패")

    async def validate_session_activity(
        self, user: User, session_id: str
    ) -> Result[bool]:
        """세션 활성 상태 및 타임아웃 확인"""
        try:
            session_key = f"session:activity:{user.id}:{session_id}"
            last_activity = await self.cache_manager.get(session_key)

            if not last_activity:
                return Result.fail("세션이 만료되었습니다")

            last_activity_time = datetime.fromisoformat(last_activity)
            if (datetime.now(timezone.utc) - last_activity_time).total_seconds() > (
                self.session_timeout * 60
            ):
                await self.session_manager.invalidate_session(user.id, session_id)
                return Result.fail("세션이 시간 초과되었습니다")

            # 활동 시간 업데이트
            await self.cache_manager.set(
                session_key,
                datetime.now(timezone.utc).isoformat(),
                ttl=self.session_timeout * 60,
            )

            return Result.ok(True)

        except Exception as e:
            self.logger.error("session_activity_check_failed", error=str(e))
            return Result.fail("세션 활성 상태 확인 실패")

    async def authenticate_user(
        self, username: str, password: str, two_factor_code: Optional[str] = None
    ) -> Result[Tuple[User, Dict[str, str]]]:
        """사용자 인증"""
        try:
            with self.metrics.token_operations.labels("authenticate_user").time():
                # 사용자 조회
                user = await User.get_by_username(username)
                if not user:
                    self.metrics.auth_failures.labels("user_not_found", username).inc()
                    return Result.fail("잘못된 사용자명 또는 비밀번호")

                # 비밀번호 검증
                if not self.password_manager.verify(password, user.hashed_password):
                    self.metrics.auth_failures.labels(
                        "invalid_password", username
                    ).inc()
                    return Result.fail("잘못된 사용자명 또는 비밀번호")

                # 2FA 검증
                if user.two_factor_enabled:
                    if not two_factor_code:
                        return Result.fail("2FA 코드가 필요합니다")

                    if not self.two_factor_auth:
                        return Result.fail(ERROR_2FA_NOT_CONFIGURED)

                    if not self.two_factor_auth.verify_code(two_factor_code):
                        self.metrics.auth_failures.labels(
                            "invalid_2fa_code", username
                        ).inc()
                        return Result.fail("잘못된 2FA 코드")

                # 계정 잠금 확인
                lock_status = await self.check_account_lock(user.id)
                if lock_status.success and lock_status.data:
                    return Result.fail("계정이 잠겼습니다. 나중에 다시 시도하세요")

                # 토큰 생성
                tokens = await self.create_tokens(user)
                if not tokens.success:
                    return tokens

                # 로그인 성공 시 실패 카운터 초기화
                await self.reset_login_failures(user.id)

                self.logger.info("user_authenticated", username=username)
                return Result.ok((user, tokens.data))

        except Exception as e:
            self.logger.error("authentication_failed", error=str(e), username=username)
            return Result.fail("인증 중 오류 발생")

    async def check_account_lock(self, user_id: str) -> Result[bool]:
        """계정 잠금 확인"""
        if not self.cache_manager:
            return Result.ok(False)

        try:
            cache_key = self.cache_manager.get_cache_key(
                CacheKeyPrefix.RATE_LIMIT, f"login_failures:{user_id}"
            )
            failures = self.cache_manager.get(cache_key) or 0

            # 최대 시도 횟수 초과 시 잠금
            if failures >= settings.MAX_LOGIN_ATTEMPTS:
                self.logger.warning(
                    "account_locked", user_id=user_id, failures=failures
                )
                return Result.ok(True)

            return Result.ok(False)

        except Exception as e:
            self.logger.error(
                "account_lock_check_failed", error=str(e), user_id=user_id
            )
            return Result.fail("계정 잠금 확인 중 오류 발생")

    async def record_login_failure(self, user_id: str) -> Result[bool]:
        """로그인 실패 기록"""
        if not self.cache_manager:
            return Result.ok(False)

        try:
            cache_key = self.cache_manager.get_cache_key(
                CacheKeyPrefix.RATE_LIMIT, f"login_failures:{user_id}"
            )
            failures = self.cache_manager.get(cache_key) or 0
            failures += 1

            # 실패 횟수 기록 (잠금 시간 설정)
            success = self.cache_manager.set(
                cache_key, failures, settings.LOGIN_LOCKOUT_DURATION * 60
            )

            self.logger.info(
                "login_failure_recorded", user_id=user_id, failures=failures
            )
            return Result.ok(success)

        except Exception as e:
            self.logger.error(
                "login_failure_record_failed", error=str(e), user_id=user_id
            )
            return Result.fail("로그인 실패 기록 중 오류 발생")

    async def reset_login_failures(self, user_id: str) -> Result[bool]:
        """로그인 실패 횟수 초기화"""
        if not self.cache_manager:
            return Result.ok(False)

        try:
            cache_key = self.cache_manager.get_cache_key(
                CacheKeyPrefix.RATE_LIMIT, f"login_failures:{user_id}"
            )
            success = self.cache_manager.delete(cache_key)

            self.logger.info("login_failures_reset", user_id=user_id)
            return Result.ok(success)

        except Exception as e:
            self.logger.error(
                "login_failures_reset_failed", error=str(e), user_id=user_id
            )
            return Result.fail("로그인 실패 횟수 초기화 중 오류 발생")

    async def change_password(
        self, user: User, current_password: str, new_password: str
    ) -> Result[bool]:
        """비밀번호 변경"""
        try:
            # 현재 비밀번호 확인
            if not self.password_manager.verify(current_password, user.hashed_password):
                return Result.fail("현재 비밀번호가 일치하지 않습니다")

            # 비밀번호 정책 검증
            history_result = await self.password_manager.get_history(user.id)
            validate_result = self.password_manager.policy.validate(
                new_password, history_result.unwrap_or([])
            )

            if not validate_result.success:
                return validate_result

            # 새 비밀번호 해시
            hash_result = self.password_manager.hash(new_password)
            if not hash_result.success:
                return hash_result

            # 비밀번호 업데이트
            user.hashed_password = hash_result.data
            user.password_last_changed = datetime.now(timezone.UTC)
            await user.save()

            # 비밀번호 히스토리 업데이트
            await self.password_manager.add_to_history(user.id, hash_result.data)

            # 모든 세션 무효화 (강제 로그아웃)
            await self.session_manager.invalidate_all_sessions(user.id)

            self.logger.info("password_changed", user_id=user.id)
            return Result.ok(True)

        except Exception as e:
            self.logger.error("password_change_failed", error=str(e), user_id=user.id)
            return Result.fail("비밀번호 변경 중 오류 발생")

    async def require_password_change(self, user: User) -> Result[bool]:
        """비밀번호 변경 요구"""
        try:
            user.password_change_required = True
            await user.save()

            self.logger.info("password_change_required", user_id=user.id)
            return Result.ok(True)

        except Exception as e:
            self.logger.error(
                "password_change_requirement_failed", error=str(e), user_id=user.id
            )
            return Result.fail("비밀번호 변경 요구 설정 중 오류 발생")

    async def enable_two_factor(self, user: User) -> Result[Dict[str, Any]]:
        """2FA 활성화"""
        try:
            if not self.two_factor_auth:
                return Result.fail(ERROR_2FA_NOT_CONFIGURED)

            if user.two_factor_enabled:
                return Result.fail("2FA가 이미 활성화되어 있습니다")

            # 새로운 비밀 키 생성
            secret = self.two_factor_auth.generate_secret()

            # 백업 코드 생성
            backup_codes = self.two_factor_auth.generate_backup_codes()

            # 사용자 정보 업데이트
            user.two_factor_secret = secret
            user.two_factor_backup_codes = backup_codes
            user.two_factor_enabled = True
            await user.save()

            # QR 코드 URI 생성
            uri = self.two_factor_auth.get_provisioning_uri(user.username, "MyApp")

            self.logger.info("2fa_enabled", user_id=str(user.id))
            return Result.ok(
                {"secret": secret, "uri": uri, "backup_codes": backup_codes}
            )

        except Exception as e:
            self.logger.error("2fa_enable_failed", error=str(e), user_id=str(user.id))
            return Result.fail("2FA 활성화 중 오류 발생")

    async def disable_two_factor(self, user: User) -> Result[bool]:
        """2FA 비활성화"""
        try:
            if not user.two_factor_enabled:
                return Result.fail(ERROR_2FA_NOT_ENABLED)

            # 2FA 정보 초기화
            user.two_factor_secret = None
            user.two_factor_backup_codes = []
            user.two_factor_enabled = False
            await user.save()

            self.logger.info("2fa_disabled", user_id=str(user.id))
            return Result.ok(True)

        except Exception as e:
            self.logger.error("2fa_disable_failed", error=str(e), user_id=str(user.id))
            return Result.fail("2FA 비활성화 중 오류 발생")

    async def verify_backup_code(self, user: User, backup_code: str) -> Result[bool]:
        """백업 코드 검증"""
        try:
            if not user.two_factor_enabled:
                return Result.fail(ERROR_2FA_NOT_ENABLED)

            if not self.two_factor_auth:
                return Result.fail(ERROR_2FA_NOT_CONFIGURED)

            if not user.two_factor_backup_codes:
                return Result.fail("백업 코드가 없습니다")

            is_valid, remaining_codes = self.two_factor_auth.verify_backup_code(
                backup_code, user.two_factor_backup_codes
            )

            if not is_valid:
                self.logger.warning("invalid_backup_code", user_id=str(user.id))
                return Result.fail("유효하지 않은 백업 코드")

            # 사용한 백업 코드 제거
            user.two_factor_backup_codes = remaining_codes
            await user.save()

            self.logger.info("backup_code_used", user_id=str(user.id))
            return Result.ok(True)

        except Exception as e:
            self.logger.error(
                "backup_code_validation_failed", error=str(e), user_id=str(user.id)
            )
            return Result.fail("백업 코드 검증 중 오류 발생")

    async def regenerate_backup_codes(self, user: User) -> Result[List[str]]:
        """백업 코드 재생성"""
        try:
            if not user.two_factor_enabled:
                return Result.fail(ERROR_2FA_NOT_ENABLED)

            if not self.two_factor_auth:
                return Result.fail(ERROR_2FA_NOT_CONFIGURED)

            # 새 백업 코드 생성
            backup_codes = self.two_factor_auth.generate_backup_codes()

            # 사용자 정보 업데이트
            user.two_factor_backup_codes = backup_codes
            await user.save()

            self.logger.info("backup_codes_regenerated", user_id=str(user.id))
            return Result.ok(backup_codes)

        except Exception as e:
            self.logger.error(
                "backup_codes_regeneration_failed", error=str(e), user_id=str(user.id)
            )
            return Result.fail("백업 코드 재생성 중 오류 발생")

    async def create_tokens(self, user: User) -> Result[Dict[str, str]]:
        """토큰 생성"""
        try:
            # 액세스 토큰 생성
            access_token_result = self.token_manager.create_token(
                user.id, TokenType.ACCESS, {"username": user.username}
            )
            if not access_token_result.success:
                return access_token_result

            # 리프레시 토큰 생성
            refresh_token_result = self.token_manager.create_token(
                user.id, TokenType.REFRESH
            )
            if not refresh_token_result.success:
                return refresh_token_result

            return Result.ok(
                {
                    "access_token": access_token_result.data,
                    "refresh_token": refresh_token_result.data,
                    "token_type": "bearer",
                }
            )

        except Exception as e:
            self.logger.error(
                "token_creation_failed", error=str(e), user_id=str(user.id)
            )
            return Result.fail("토큰 생성 중 오류 발생")

    async def refresh_tokens(self, refresh_token: str) -> Result[Dict[str, str]]:
        """토큰 갱신"""
        try:
            # 리프레시 토큰 검증
            verify_result = self.token_manager.verify_token(
                refresh_token, TokenType.REFRESH, validate_session=False
            )
            if not verify_result.success:
                return verify_result

            payload = verify_result.data
            user_id = payload["sub"]

            # 사용자 조회
            user = await User.get(user_id)
            if not user:
                return Result.fail("사용자를 찾을 수 없습니다")

            # 기존 토큰 블랙리스트에 추가
            await self.token_manager.blacklist(payload)

            # 새로운 토큰 생성
            return await self.create_tokens(user)

        except Exception as e:
            self.logger.error("token_refresh_failed", error=str(e))
            return Result.fail("토큰 갱신 중 오류 발생")

    async def logout(self, token: str, invalidate_all: bool = False) -> Result[bool]:
        """로그아웃"""
        try:
            # 토큰 검증
            verify_result = self.token_manager.verify_token(token)
            if not verify_result.success:
                return verify_result

            payload = verify_result.data
            user_id = payload["sub"]

            # 토큰 블랙리스트에 추가
            blacklist_result = await self.token_manager.blacklist(payload)
            if not blacklist_result.success:
                return blacklist_result

            # 모든 세션 무효화
            if invalidate_all:
                return await self.session_manager.invalidate_all_sessions(user_id)

            # 현재 세션만 무효화
            return await self.session_manager.invalidate_session(
                user_id, payload["jti"]
            )

        except Exception as e:
            self.logger.error("logout_failed", error=str(e))
            return Result.fail("로그아웃 중 오류 발생")

    def generate_password_reset_token(self, email: str) -> Result[str]:
        """비밀번호 재설정 토큰 생성"""
        try:
            return self.token_manager.create_token(
                email, TokenType.RESET, {"purpose": "password_reset"}
            )
        except Exception as e:
            self.logger.error(
                "reset_token_generation_failed", error=str(e), email=email
            )
            return Result.fail("재설정 토큰 생성 중 오류 발생")

    def verify_password_reset_token(self, token: str) -> Result[str]:
        """비밀번호 재설정 토큰 검증"""
        try:
            verify_result = self.token_manager.verify_token(
                token, TokenType.RESET, validate_session=False
            )
            if not verify_result.success:
                return verify_result

            payload = verify_result.data
            if payload.get("purpose") != "password_reset":
                return Result.fail("잘못된 토큰 용도")

            return Result.ok(payload["sub"])  # 이메일 반환

        except Exception as e:
            self.logger.error("reset_token_verification_failed", error=str(e))
            return Result.fail("재설정 토큰 검증 중 오류 발생")


# 의존성 주입 함수
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# 팩토리 및 설정 클래스
class SecurityConfig(BaseModel):
    """보안 관련 설정"""

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    password_reset_token_expire_hours: int
    service_name: str
    min_password_length: int = 8
    max_password_length: int = 128

    @classmethod
    def from_settings(cls) -> "SecurityConfig":
        """환경 설정에서 보안 설정 생성"""
        return cls(
            secret_key=settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
            access_token_expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            refresh_token_expire_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
            password_reset_token_expire_hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS,
            service_name=settings.SERVICE_NAME,
        )


def create_cache_manager(
    cache_instance: Optional[CacheInterface] = None,
) -> CacheManager:
    """캐시 매니저 생성"""
    if cache_instance is None:
        from packages.api.src.corecache import CacheBackendType, CacheSettings

        settings = CacheSettings(
            backend_type=CacheBackendType.MEMORY, default_ttl=3600, enable_cache=True
        )
        return CacheManager(settings)
    return CacheManager(cache_instance)


def create_session_manager(
    cache_manager: Optional[CacheManager] = None,
) -> SessionManager:
    """세션 매니저 생성"""
    return SessionManager(cache_manager or create_cache_manager())


def create_token_manager(
    session_manager: Optional[SessionManager] = None,
    cache_manager: Optional[CacheManager] = None,
) -> TokenManager:
    """토큰 매니저 생성"""
    _cache_manager = cache_manager or create_cache_manager()
    _session_manager = session_manager or create_session_manager(_cache_manager)
    return TokenManager(_cache_manager, _session_manager)


def create_password_manager(
    policy: Optional[PasswordPolicy] = None,
    cache_manager: Optional[CacheManager] = None,
) -> PasswordManager:
    """패스워드 매니저 생성"""
    return PasswordManager(
        policy or PasswordPolicy(), cache_manager or create_cache_manager()
    )


def create_two_factor_auth(secret_key: Optional[str] = None) -> TwoFactorAuth:
    """2FA 인증 생성"""
    return TwoFactorAuth(secret_key=secret_key)


def create_security_service(
    token_manager: Optional[TokenManager] = None,
    password_manager: Optional[PasswordManager] = None,
    session_manager: Optional[SessionManager] = None,
    two_factor_auth: Optional[TwoFactorAuth] = None,
    cache_manager: Optional[CacheManager] = None,
) -> SecurityService:
    """보안 서비스 생성"""
    _cache_manager = cache_manager or create_cache_manager()
    _session_manager = session_manager or create_session_manager(_cache_manager)
    _token_manager = token_manager or create_token_manager(
        _session_manager, _cache_manager
    )
    _password_manager = password_manager or create_password_manager(
        cache_manager=_cache_manager
    )
    _two_factor_auth = two_factor_auth or create_two_factor_auth()

    return SecurityService(
        token_manager=_token_manager,
        password_manager=_password_manager,
        session_manager=_session_manager,
        two_factor_auth=_two_factor_auth,
        cache_manager=_cache_manager,
    )


# 모듈 외부에서 사용할 인스턴스
_security_service = None


def get_security_service() -> SecurityService:
    """보안 서비스 의존성"""
    global _security_service
    if _security_service is None:
        _security_service = create_security_service()
    return _security_service


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    security_service: SecurityService = Depends(get_security_service),
) -> User:
    """현재 사용자 조회"""
    verify_result = await security_service.token_manager.verify_token(token)
    if not verify_result.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 정보",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_result.data
    user = await User.get(payload["sub"])

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다"
        )

    return user


def verify_admin_access(user: User = Depends(get_current_user)) -> User:
    """관리자 권한 검증"""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다"
        )
    return user


# 테스트 유틸리티
def create_test_user(user_id: str = "test-user", is_admin: bool = False) -> User:
    """테스트용 사용자 생성"""
    user = User()
    user.id = user_id
    user.username = f"user-{user_id}"
    user.email = f"user-{user_id}@example.com"
    user.is_admin = is_admin
    user.is_active = True
    return user


def create_test_token(
    user_id: str = "test-user", token_type: TokenType = TokenType.ACCESS
) -> str:
    """테스트용 토큰 생성"""
    token_manager = create_token_manager()
    result = token_manager.create_token(user_id, token_type)
    return result.unwrap()


def mock_security_service(
    mock_user: Optional[User] = None, authentication_success: bool = True
) -> SecurityService:
    """테스트용 모의 보안 서비스"""
    service = create_security_service()

    if mock_user and authentication_success:
        service.authenticate_user = lambda *args, **kwargs: Result.ok(
            (
                mock_user,
                {
                    "access_token": "test-token",
                    "refresh_token": "test-refresh",
                    "token_type": "bearer",
                },
            )
        )
    else:
        service.authenticate_user = lambda *args, **kwargs: Result.fail("인증 실패")

    return service


# 모듈 초기화
def init_security(
    settings_override: Optional[Dict[str, Any]] = None,
) -> SecurityService:
    """보안 모듈 초기화"""
    # 설정 재정의가 있는 경우 적용
    if settings_override:
        for key, value in settings_override.items():
            setattr(settings, key, value)

    # 로깅 설정
    configure_logging()

    # 보안 서비스 및 종속성 생성
    cache_manager = create_cache_manager()
    return create_security_service(cache_manager=cache_manager)


def configure_logging():
    """로깅 설정"""
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_token_from_header(authorization: str) -> str:
    """
    Authorization 헤더에서 토큰 추출

    Args:
        authorization: Authorization 헤더 값

    Returns:
        str: 추출된 토큰

    Raises:
        ValueError: 토큰이 없거나 형식이 잘못된 경우
    """
    if not authorization:
        raise ValueError("Authorization 헤더가 없습니다.")

    parts = authorization.split()

    if len(parts) != 2:
        raise ValueError("잘못된 Authorization 헤더 형식입니다.")

    if parts[0].lower() != "bearer":
        raise ValueError("Bearer 토큰이 아닙니다.")

    return parts[1]


def create_access_token(
    subject: Union[str, Any],
    extra_data: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    액세스 토큰을 생성합니다.

    Args:
        subject: 토큰의 주체 (일반적으로 사용자 ID)
        extra_data: 토큰에 포함할 추가 데이터
        expires_delta: 만료 시간 델타

    Returns:
        str: 생성된 액세스 토큰
    """
    if extra_data is None:
        extra_data = {}

    expires = datetime.now(timezone.utc)
    if expires_delta:
        expires = expires + expires_delta
    else:
        expires = expires + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "exp": expires,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "token_type": TOKEN_TYPE_ACCESS,
        **extra_data,
    }

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    record_token_created()
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any], extra_data: Optional[Dict[str, Any]] = None
) -> str:
    """
    리프레시 토큰을 생성합니다.

    Args:
        subject: 토큰의 주체 (일반적으로 사용자 ID)
        extra_data: 토큰에 포함할 추가 데이터

    Returns:
        str: 생성된 리프레시 토큰
    """
    if extra_data is None:
        extra_data = {}

    expires = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    to_encode = {
        "sub": str(subject),
        "exp": expires,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "token_type": TOKEN_TYPE_REFRESH,
        **extra_data,
    }

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    record_token_refreshed()
    return encoded_jwt


# 블랙리스트 토큰 저장소
_blacklisted_tokens = set()


def verify_and_decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    """
    토큰을 검증하고 디코딩합니다.

    Args:
        token: 검증할 토큰
        expected_type: 예상 토큰 타입

    Returns:
        Dict[str, Any]: 디코딩된 토큰 페이로드

    Raises:
        Exception: 토큰이 유효하지 않거나 타입이 일치하지 않는 경우
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # 토큰 타입 검증
        if "token_type" not in payload:
            raise ValueError("토큰에 타입 정보가 없습니다")

        if payload["token_type"] != expected_type:
            raise ValueError(
                f"토큰 타입 불일치: {payload['token_type']} != {expected_type}"
            )

        # JTI 확인
        if "jti" in payload and is_token_blacklisted(payload["jti"]):
            raise ValueError("무효화된 토큰입니다")

        return payload
    except Exception as e:
        raise Exception(f"토큰 검증 실패: {str(e)}")


def blacklist_token(payload: Dict[str, Any], ttl: int = 3600) -> bool:
    """
    토큰을 블랙리스트에 추가합니다.

    Args:
        payload: 토큰 페이로드
        ttl: 블랙리스트 유지 시간(초)

    Returns:
        bool: 성공 여부
    """
    try:
        if "jti" not in payload:
            return False

        _blacklisted_tokens.add(payload["jti"])
        record_token_blacklisted()
        return True
    except Exception:
        return False


def is_token_blacklisted(jti: str) -> bool:
    """
    토큰이 블랙리스트에 있는지 확인합니다.

    Args:
        jti: 토큰 식별자

    Returns:
        bool: 블랙리스트에 있으면 True, 아니면 False
    """
    return jti in _blacklisted_tokens
