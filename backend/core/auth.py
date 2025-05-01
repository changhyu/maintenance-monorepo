"""
권한 검증 및 인증 관련 핵심 모듈
"""
import jwt
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.core.config import get_settings
from backend.core.logger import get_logger
from backend.db.session import get_db
from backend.models.user import User

# 설정 및 로거 초기화
settings = get_settings()
logger = get_logger(__name__)
# 디버그 로깅 활성화
logger.setLevel("DEBUG")

# OAuth2 인증 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/token")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    액세스 토큰 생성 함수
    
    Args:
        data: 인코딩할 데이터
        expires_delta: 만료 시간 (None일 경우 기본값 사용)
        
    Returns:
        str: JWT 토큰 문자열
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})

    # 사용자 이메일이 있으면 해당 이메일의 권한 정보 추가
    if "sub" in to_encode:
        try:
            from backend.db.session import SessionLocal
            from backend.models.role import Role
            from backend.models.permission import Permission
            from backend.models.user import UserRole
            
            db = SessionLocal()
            user = db.query(User).filter(User.email == to_encode["sub"]).first()
            
            if user:
                # 사용자 역할에 대한 모든 권한 이름 추출
                permissions = []
                if hasattr(user, "role") and user.role:
                    # 역할이 UserRole enum인 경우 (예: UserRole.ADMIN)
                    to_encode["role"] = user.role.value if hasattr(user.role, "value") else str(user.role)
                    
                    # 직접 SQL 쿼리를 통한 권한 조회 (role이 문자열 타입인 경우)
                    if isinstance(user.role, UserRole):
                        sql_query = text("""
                            SELECT p.name FROM permissions p
                            JOIN role_permissions rp ON p.id = rp.permission_id
                            JOIN roles r ON r.id = rp.role_id
                            WHERE r.name = :role_name
                        """)
                        results = db.execute(sql_query, {"role_name": user.role.value})
                        for row in results:
                            permissions.append(row[0])
                
                # 사용자가 직접 가진 권한도 추가 (있는 경우)
                if hasattr(user, "permissions"):
                    for permission in user.permissions:
                        if permission.name not in permissions:
                            permissions.append(permission.name)
                
                # 역할 기반 권한 추가
                if user.role == UserRole.ADMIN:
                    # 관리자는 모든 권한을 가짐
                    admin_permissions = [
                        "user:create", "user:read", "user:update", "user:delete",
                        "role:manage", "system:settings", "admin:read", "admin:write"
                    ]
                    for perm in admin_permissions:
                        if perm not in permissions:
                            permissions.append(perm)
                    
                # 권한 목록을 토큰에 추가
                to_encode["permissions"] = permissions
                logger.debug(f"Adding permissions to token: {permissions}")
            
            db.close()
        except Exception as e:
            logger.error(f"Error adding permissions to token: {str(e)}")
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_permission(token: str, required_permission: str) -> bool:
    """
    토큰에서 권한을 확인하는 함수
    
    Args:
        token: JWT 토큰 문자열
        required_permission: 필요한 권한 문자열
        
    Returns:
        bool: 권한이 있으면 True, 없으면 False
        
    Raises:
        HTTPException: 토큰이 유효하지 않거나 만료된 경우
    """
    try:
        # 토큰 디코딩
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # 토큰에서 권한 목록 추출
        permissions: List[str] = payload.get("permissions", [])
        
        # 필요한 권한이 있는지 확인
        has_permission = required_permission in permissions
        
        logger.debug(f"Permission check: {required_permission}, Has permission: {has_permission}")
        
        return has_permission
        
    except jwt.PyJWTError as e:
        logger.error(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_permissions(token: str = Depends(oauth2_scheme)) -> List[str]:
    """
    현재 사용자의 권한 목록을 가져오는 함수
    
    Args:
        token: JWT 토큰 문자열
        
    Returns:
        List[str]: 권한 목록
        
    Raises:
        HTTPException: 토큰이 유효하지 않거나 만료된 경우
    """
    try:
        # 토큰 디코딩
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # 토큰에서 권한 목록 추출
        permissions: List[str] = payload.get("permissions", [])
        
        return permissions
        
    except jwt.PyJWTError as e:
        logger.error(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    현재 인증된 사용자를 가져오는 함수
    
    Args:
        token: JWT 토큰 문자열
        db: 데이터베이스 세션
        
    Returns:
        User: 사용자 객체
        
    Raises:
        HTTPException: 사용자가 인증되지 않았거나 찾을 수 없는 경우
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token missing 'sub' field")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"User not found: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user_id(current_user: User = Depends(get_current_user)) -> int:
    """
    현재 인증된 사용자의 ID를 반환하는 함수
    
    Args:
        current_user: 현재 사용자 객체
        
    Returns:
        int: 사용자 ID
    """
    return current_user.id


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    현재 활성화된 사용자를 가져오는 함수
    
    Args:
        current_user: 현재 사용자 객체
        
    Returns:
        User: 활성화된 사용자 객체
        
    Raises:
        HTTPException: 사용자가 비활성화된 경우
    """
    if not current_user.is_active:
        logger.warning(f"Inactive user attempted login: {current_user.email}")
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def has_permission(user: User, permission_name: str, db: Session) -> bool:
    """
    사용자가 특정 권한을 가지고 있는지 확인하는 함수
    
    Args:
        user: 사용자 객체
        permission_name: 확인할 권한 이름
        db: 데이터베이스 세션
        
    Returns:
        bool: 권한이 있으면 True, 없으면 False
    """
    # 슈퍼유저는 모든 권한을 가짐
    if user.is_superuser:
        logger.debug(f"User {user.email} is superuser, granting all permissions")
        return True
    
    # 권한 정보 디버그 로깅
    logger.debug(f"Checking permission '{permission_name}' for user {user.email}")
    logger.debug(f"User role_id: {user.role_id}")
    
    try:
        # 역할 기반으로 권한 확인
        if user.role_id:
            from backend.models.role import Role
            from backend.models.permission import Permission
            
            # 사용자 역할 가져오기 (만약 lazy loading이 문제라면)
            role = db.query(Role).filter(Role.id == user.role_id).first()
            if role:
                logger.debug(f"User has role: {role.name}")
                
                # 조인을 사용하여 권한 확인 (가장 확실한 방법)
                stmt = text("""
                    SELECT p.name FROM permissions p
                    JOIN role_permissions rp ON p.id = rp.permission_id
                    WHERE rp.role_id = :role_id
                """)
                results = db.execute(stmt, {"role_id": role.id}).fetchall()
                permissions = [row[0] for row in results]
                logger.debug(f"Permissions for role {role.name}: {permissions}")
                
                if permission_name in permissions:
                    logger.debug(f"Permission '{permission_name}' found for role {role.name}")
                    return True
                
                # 만약 ORM 관계가 제대로 설정되어 있으면 이 방법도 시도
                if hasattr(role, "permissions"):
                    for permission in role.permissions:
                        logger.debug(f"Checking role permission: {permission.name}")
                        if permission.name == permission_name:
                            logger.debug(f"User {user.email} has permission {permission_name} through role {role.name}")
                            return True
    except Exception as e:
        logger.error(f"Error checking role-based permission: {str(e)}")
    
    # 사용자가 직접 가진 권한 확인 (있는 경우)
    try:
        if hasattr(user, "permissions"):
            for permission in user.permissions:
                logger.debug(f"Checking user permission: {permission.name}")
                if permission.name == permission_name:
                    logger.debug(f"User {user.email} has direct permission: {permission_name}")
                    return True
    except Exception as e:
        logger.error(f"Error checking user direct permissions: {str(e)}")
            
    logger.warning(f"Permission denied: User {user.email} does not have {permission_name}")
    return False


def permission_required(permission_name: str) -> Callable:
    """
    특정 권한이 필요한 엔드포인트를 보호하는 의존성 함수
    
    Args:
        permission_name: 필요한 권한 이름
        
    Returns:
        Callable: 권한 체크 함수
    """
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        if not has_permission(current_user, permission_name, db):
            logger.warning(f"Permission denied: {current_user.email} attempted to access {permission_name}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    
    return permission_checker