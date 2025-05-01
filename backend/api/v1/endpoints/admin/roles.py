"""
관리자용 역할 관리 API 모듈
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.core.auth import get_current_active_user
from backend.db.session import get_db
from backend.models.user import User, UserRole
from backend.models.role import Role
from backend.models.permission import Permission

router = APIRouter(tags=["관리자 역할 관리"])

@router.get(
    "/api/admin/roles",
    response_model=Dict[str, Any],
    summary="역할 목록 조회 (관리자용)"
)
async def get_admin_roles(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 역할 목록을 조회합니다.
    각 역할에 할당된 권한 정보도 함께 반환합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 모든 역할 조회
    roles = db.query(Role).all()
    
    # 역할별 사용자 수 계산
    role_user_counts = {}
    for role in roles:
        role_user_counts[role.id] = db.query(User).filter(User.role_id == role.id).count()
    
    # 응답 데이터 구성
    result = []
    for role in roles:
        permissions = []
        if hasattr(role, "permissions"):
            permissions = [
                {"id": p.id, "name": p.name, "description": p.description}
                for p in role.permissions
            ]
        
        result.append({
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "permissions": permissions,
            "user_count": role_user_counts.get(role.id, 0),
            "created_at": role.created_at,
            "updated_at": role.updated_at
        })
    
    return {"roles": result}

@router.get(
    "/api/admin/roles/{role_id}",
    response_model=Dict[str, Any],
    summary="역할 상세 정보 조회 (관리자용)"
)
async def get_admin_role_detail(
    role_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 특정 역할의 상세 정보를 조회합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 역할 조회
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # 해당 역할을 가진 사용자 수 계산
    user_count = db.query(User).filter(User.role_id == role_id).count()
    
    # 권한 목록
    permissions = []
    if hasattr(role, "permissions"):
        permissions = [
            {"id": p.id, "name": p.name, "description": p.description}
            for p in role.permissions
        ]
    
    # 응답 데이터 구성
    return {
        "role": {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "permissions": permissions,
            "user_count": user_count,
            "created_at": role.created_at,
            "updated_at": role.updated_at
        }
    }

@router.post(
    "/api/admin/roles",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="역할 생성 (관리자용)"
)
async def create_admin_role(
    role_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 새 역할을 생성합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 역할 이름 중복 확인
    if db.query(Role).filter(Role.name == role_data.get("name")).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    # 새 역할 생성
    try:
        new_role = Role(
            name=role_data.get("name"),
            description=role_data.get("description", "")
        )
        db.add(new_role)
        db.commit()
        db.refresh(new_role)
        
        # 권한 할당
        permission_ids = role_data.get("permission_ids", [])
        if permission_ids:
            permissions = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
            new_role.permissions = permissions
            db.commit()
            
        return {
            "success": True,
            "role": {
                "id": new_role.id,
                "name": new_role.name,
                "description": new_role.description,
                "permissions": [
                    {"id": p.id, "name": p.name, "description": p.description}
                    for p in new_role.permissions
                ] if hasattr(new_role, "permissions") else [],
                "created_at": new_role.created_at
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create role: {str(e)}"
        )

@router.put(
    "/api/admin/roles/{role_id}",
    response_model=Dict[str, Any],
    summary="역할 정보 수정 (관리자용)"
)
async def update_admin_role(
    role_id: int,
    role_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 역할 정보를 수정합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 역할 조회
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # 기본 역할 변경 방지 (선택적)
    if role.name in ["ADMIN", "MANAGER", "USER"] and "name" in role_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change name of system default roles"
        )
    
    # 이름 중복 확인
    if "name" in role_data and role_data["name"] != role.name:
        if db.query(Role).filter(Role.name == role_data["name"]).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists"
            )
    
    # 데이터 업데이트
    if "name" in role_data:
        role.name = role_data["name"]
    if "description" in role_data:
        role.description = role_data["description"]
    
    # 권한 업데이트
    if "permission_ids" in role_data:
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_data["permission_ids"])
        ).all()
        role.permissions = permissions
    
    try:
        db.commit()
        db.refresh(role)
        
        return {
            "success": True,
            "role": {
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "permissions": [
                    {"id": p.id, "name": p.name, "description": p.description}
                    for p in role.permissions
                ] if hasattr(role, "permissions") else [],
                "updated_at": role.updated_at
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )

@router.delete(
    "/api/admin/roles/{role_id}",
    response_model=Dict[str, bool],
    summary="역할 삭제 (관리자용)"
)
async def delete_admin_role(
    role_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 역할을 삭제합니다.
    기본 시스템 역할은 삭제할 수 없습니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 역할 조회
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # 기본 역할 삭제 방지
    if role.name in ["ADMIN", "MANAGER", "USER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system default roles"
        )
    
    # 해당 역할을 사용 중인 사용자 확인
    user_count = db.query(User).filter(User.role_id == role_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role. It is assigned to {user_count} users."
        )
    
    try:
        db.delete(role)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete role: {str(e)}"
        )

@router.get(
    "/api/admin/permissions",
    response_model=Dict[str, List],
    summary="권한 목록 조회 (관리자용)"
)
async def get_admin_permissions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    관리자 권한으로 시스템에 정의된 권한 목록을 조회합니다.
    """
    # 관리자 권한 체크
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 모든 권한 조회
    permissions = db.query(Permission).all()
    
    # 응답 데이터 구성
    return {
        "permissions": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            for p in permissions
        ]
    }