"""
관리자용 사용자 관리 API 모듈
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.core.auth import get_current_active_user
from backend.db.session import get_db
from backend.models.user import User, UserRole
from backend.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(tags=["관리자 사용자 관리"])

@router.get(
    "/api/admin/users",
    response_model=Dict[str, Any],
    summary="사용자 목록 조회 (관리자용)"
)
async def get_admin_users(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    search: Optional[str] = Query(None, description="검색어 (이름, 이메일)"),
    role: Optional[str] = Query(None, description="역할 필터링"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 사용자 목록을 조회합니다.
    페이지네이션, 검색, 역할 필터링 기능을 제공합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 기본 쿼리
    query = db.query(User)
    
    # 검색 필터 적용
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
        )
    
    # 역할 필터 적용
    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            # 유효하지 않은 역할은 무시
            pass
    
    # 총 사용자 수 계산
    total_count = query.count()
    
    # 페이지네이션 적용
    query = query.offset((page - 1) * limit).limit(limit)
    
    # 사용자 목록 조회
    users = query.all()
    
    # 페이지네이션 정보
    pagination = {
        "page": page,
        "limit": limit,
        "total": total_count,
        "total_pages": (total_count + limit - 1) // limit  # 올림 연산
    }
    
    # 응답 데이터 구성
    return {
        "users": [{
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        } for user in users],
        "pagination": pagination
    }

@router.post(
    "/api/admin/users",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="사용자 생성 (관리자용)"
)
async def create_admin_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 새 사용자를 생성합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 이메일 중복 확인
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 새 사용자 생성
    import bcrypt
    password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    
    try:
        new_user = User(
            email=user_data.email,
            name=user_data.name,
            password_hash=password_hash,
            role=UserRole(user_data.role) if user_data.role else UserRole.USER,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "success": True,
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "name": new_user.name,
                "role": new_user.role.value if hasattr(new_user.role, "value") else str(new_user.role),
                "is_active": new_user.is_active,
                "created_at": new_user.created_at
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.get(
    "/api/admin/users/{user_id}",
    response_model=Dict[str, Any],
    summary="사용자 상세 정보 조회 (관리자용)"
)
async def get_admin_user_detail(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 특정 사용자의 상세 정보를 조회합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 조회
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 사용자 활동 기록
    user_activities = []  # 실제로는 활동 기록 모델에서 조회
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        },
        "activities": user_activities
    }

@router.put(
    "/api/admin/users/{user_id}",
    response_model=Dict[str, Any],
    summary="사용자 정보 수정 (관리자용)"
)
async def update_admin_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 사용자 정보를 수정합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 조회
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 데이터 업데이트
    update_data = user_data.dict(exclude_unset=True)
    
    # 비밀번호 변경이 있는 경우
    if "password" in update_data and update_data["password"]:
        import bcrypt
        update_data["password_hash"] = bcrypt.hashpw(
            update_data.pop("password").encode(), bcrypt.gensalt()
        ).decode()
    
    # 역할 업데이트가 있는 경우
    if "role" in update_data and update_data["role"]:
        try:
            update_data["role"] = UserRole(update_data["role"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role value"
            )
    
    # 사용자 정보 업데이트
    for field, value in update_data.items():
        setattr(user, field, value)
    
    try:
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "is_active": user.is_active,
                "updated_at": user.updated_at
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete(
    "/api/admin/users/{user_id}",
    response_model=Dict[str, bool],
    summary="사용자 삭제 (관리자용)"
)
async def delete_admin_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 사용자를 삭제합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 자기 자신을 삭제하려는 경우 방지
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    # 사용자 조회
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        db.delete(user)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )