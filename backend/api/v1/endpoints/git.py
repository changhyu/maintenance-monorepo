"""
Git API 리디렉션 모듈

이 모듈은 레거시 지원을 위해 존재하며 모든 요청을 git_unified.py로 리디렉션합니다.
새로운 개발은 git_unified.py에서 이루어져야 합니다.
"""
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from typing import Any, Dict, Optional
from backend.api.v1.endpoints.git_unified import router as git_unified_router
from backend.core.auth import get_current_active_user
import logging

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/git", tags=["Git (레거시)"])

# 레거시 엔드포인트에서 통합 엔드포인트로의 매핑
ENDPOINT_MAPPING = {
    "branches": "/git/branches",
    "status": "/git/repo-status",
    "commits": "/git/commits",
    "tags": "/git/tags",
    "diff": "/git/diff",
    "file-history": "/git/file-history",
    # 기타 엔드포인트 매핑 추가
}

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def deprecated_git_endpoint(request: Request, path: str = ""):
    """
    모든 Git API 요청을 통합된 git_unified.py 엔드포인트로 리디렉션합니다.
    
    Args:
        request: FastAPI 요청 객체
        path: 요청 경로
        
    Returns:
        Response: 리디렉션 응답 또는 경고 메시지
    """
    # 로깅 - 레거시 엔드포인트 사용 감지
    logger.warning(f"레거시 Git API 엔드포인트 사용 감지: {request.url.path} - {request.client.host}")
    
    # 매핑된 새 엔드포인트 찾기
    new_endpoint = None
    for old_path, new_path in ENDPOINT_MAPPING.items():
        if path.startswith(old_path):
            new_endpoint = new_path
            break
    
    # 클라이언트에게 경고 메시지 전송
    response = {
        "warning": "이 Git API 엔드포인트는 더 이상 사용되지 않습니다.",
        "message": "통합된 Git API '/api/v1/git-unified'를 사용하세요.",
        "redirected": True
    }
    
    # 매핑된 엔드포인트가 있으면 추가 정보 제공
    if new_endpoint:
        response["migration_guide"] = {
            "old_endpoint": f"/api/v1/git/{path}",
            "new_endpoint": f"/api/v1{new_endpoint}",
            "documentation": "/docs#tag/Git-관리"
        }
    
    # 하위 호환성을 위해 상태 코드는 301 (영구 리디렉션) 대신 200 사용
    return response