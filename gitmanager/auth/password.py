import re
import string
import uuid
from typing import Tuple, List
from ..config.settings import settings

def validate_password(password: str) -> Tuple[bool, List[str]]:
    """패스워드 규칙 검증"""
    errors = []
    
    # 길이 검증
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        errors.append(f"패스워드는 최소 {settings.MIN_PASSWORD_LENGTH}자 이상이어야 합니다.")
    
    if len(password) > settings.MAX_PASSWORD_LENGTH:
        errors.append(f"패스워드는 최대 {settings.MAX_PASSWORD_LENGTH}자 이하이어야 합니다.")
    
    # 복잡성 검증
    if settings.PASSWORD_REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
        errors.append("패스워드에는 적어도 하나의 대문자가 포함되어야 합니다.")
    
    if settings.PASSWORD_REQUIRE_LOWERCASE and not any(c.islower() for c in password):
        errors.append("패스워드에는 적어도 하나의 소문자가 포함되어야 합니다.")
    
    if settings.PASSWORD_REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
        errors.append("패스워드에는 적어도 하나의 숫자가 포함되어야 합니다.")
    
    if settings.PASSWORD_REQUIRE_SPECIAL_CHARS and not any(c in string.punctuation for c in password):
        errors.append("패스워드에는 적어도 하나의 특수문자가 포함되어야 합니다.")
    
    # 연속 문자 검증
    max_consecutive = settings.PASSWORD_MAX_CONSECUTIVE_CHARS
    for i in range(len(password) - max_consecutive + 1):
        if all(password[i] == password[i+j] for j in range(1, max_consecutive)):
            errors.append(f"패스워드에는 {max_consecutive}개 이상의 동일한 연속 문자가 포함될 수 없습니다.")
            break
    
    # 흔한 패스워드 검증 (실제 구현에서는 데이터베이스나 파일에서 흔한 패스워드 목록을 로드)
    common_passwords = ["password", "123456", "qwerty", "admin", "welcome"]
    if settings.PASSWORD_PREVENT_COMMON_PASSWORDS and password.lower() in common_passwords:
        errors.append("너무 흔한 패스워드는 사용할 수 없습니다.")
    
    return len(errors) == 0, errors

def generate_password_hash(password: str) -> str:
    """패스워드 해시 생성 (실제 구현에서는 bcrypt나 argon2와 같은 강력한 해시 알고리즘 사용)"""
    # 이 예제에서는 실제 해시 구현을 포함하지 않습니다
    # 실제 구현시 다음과 같이 사용
    # import bcrypt
    # salt = bcrypt.gensalt()
    # hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    # return hashed.decode('utf-8')
    
    # 예시 구현 (실제 프로덕션에서는 사용하지 마세요!)
    return f"hashed_{password}_{uuid.uuid4().hex}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """패스워드 검증 (실제 구현에서는 bcrypt나 argon2와 같은 강력한 해시 알고리즘 사용)"""
    # 이 예제에서는 실제 해시 검증 구현을 포함하지 않습니다
    # 실제 구현시 다음과 같이 사용
    # import bcrypt
    # return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    # 예시 구현 (실제 프로덕션에서는 사용하지 마세요!)
    return hashed_password.startswith(f"hashed_{plain_password}_") 