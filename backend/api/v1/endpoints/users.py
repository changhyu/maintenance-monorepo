from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List
from sqlalchemy.orm import Session

from backend.core.auth import get_current_active_user, permission_required
from backend.db.session import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(tags=["사용자"])

@router.get(
    "/users/",
    response_model=List[UserResponse],
    summary="사용자 목록 조회"
)
async def get_users(
    request: Request,
    current_user: User = Depends(permission_required("user:read")),
    db: Session = Depends(get_db)
):
    return db.query(User).all()

@router.get(
    "/users/me",
    response_model=UserResponse,
    summary="내 프로필 조회"
)
async def get_my_profile(
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    return current_user

@router.post(
    "/users/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="사용자 생성"
)
async def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: User = Depends(permission_required("user:create")),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    from backend.models.role import Role
    role = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role not found"
        )
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=user_data.password,  # TODO: Hash password
        role_id=user_data.role_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="사용자 정보 수정"
)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    return target

@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="사용자 삭제"
)
async def delete_user(
    user_id: int,
    current_user: User = Depends(permission_required("user:delete")),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    db.delete(target)
    db.commit()
    return None 