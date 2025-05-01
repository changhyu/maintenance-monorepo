"""
보안 관련 유틸리티 모듈
암호화, 비밀번호 해싱 등의 보안 기능을 제공합니다.
"""
from passlib.context import CryptContext
import bcrypt

# 비밀번호 암호화를 위한 CryptContext 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """
    주어진 평문 비밀번호의 해시된 값을 반환합니다.
    
    Args:
        password: 해시할 평문 비밀번호
        
    Returns:
        str: 해시된 비밀번호
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해시된 비밀번호를 비교하여 일치 여부를 확인합니다.
    
    Args:
        plain_password: 검증할 평문 비밀번호
        hashed_password: 저장된 해시 비밀번호
        
    Returns:
        bool: 비밀번호가 일치하면 True, 아니면 False
    """
    return pwd_context.verify(plain_password, hashed_password)

def generate_salt() -> str:
    """
    새로운 bcrypt 솔트를 생성합니다.
    
    Returns:
        str: 생성된 솔트
    """
    return bcrypt.gensalt().decode()