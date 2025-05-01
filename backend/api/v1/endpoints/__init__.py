from fastapi import APIRouter  # module initialization
from .root import router as root_router
from .auth import router as auth_router
from .users import router as users_router
from .roles import router as roles_router
from .permissions import router as permissions_router
from .settings import router as settings_router
from .git_unified import router as git_router  # 통합된 Git API 라우터 사용
from .system import router as system_router
from .logs import router as logs_router
from .admin import router as admin_router  # 관리자 API 라우터
