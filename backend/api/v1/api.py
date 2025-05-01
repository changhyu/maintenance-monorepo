from fastapi import APIRouter
from .endpoints import auth, logs, permissions, roles, root, settings, system, users
from .endpoints import git_unified as git  # 통합된 Git API 사용
from .endpoints import admin  # 관리자 API 모듈 추가

api_router = APIRouter()
api_router.include_router(root.router, tags=["root"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(git.router, prefix="/git", tags=["git"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(admin.router, tags=["admin"])  # 관리자 API 라우터 추가
