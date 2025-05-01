"""
통합 Git API 엔드포인트 모듈

이 모듈은 Git 저장소 관리를 위한 모든 API 엔드포인트를 제공합니다.
백엔드의 모든 Git 관련 작업은 이 모듈을 통해 수행됩니다.

버전 정보:
- 현재 버전: 1.1.0
- 최초 작성: 2023-08-15
- 마지막 업데이트: 2023-11-21
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Body
from typing import Dict, List, Optional, Any
import os
import sys
from datetime import datetime
from pathlib import Path
from contextlib import suppress
from backend.core.auth import get_current_active_user, permission_required
from backend.models.user import User
from backend.models.git_operation_log import GitOperationLog, GitOperationType, GitOperationStatus
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.core.config import settings
from backend.core.logger import get_logger
from backend.api.v1.common.response import StandardResponse, success_response, error_response
from backend.core.errors import (
    GitServiceUnavailableError, 
    GitRepositoryNotFoundError,
    GitBranchNotFoundError,
    GitFileNotFoundError,
    GitConflictError,
    GitServiceError,
    ErrorCode
)

# 로거 설정
logger = get_logger("git_api")

# Git 서비스 임포트를 위한 설정
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

# Git 관련 서비스 가용성 확인
git_patch_available = False
git_service_available = False

# 권한 상수 정의
GIT_WRITE_PERMISSION = "git:write"
ADMIN_READ_PERMISSION = "admin:read"

# GitPython 패치 적용 시도
with suppress(ImportError):
    import gitpython
    with suppress(ImportError, AttributeError):
        gitpython.apply_patches()  # GitPython 패치 적용
        git_patch_available = True

# GitService 임포트 시도
with suppress(ImportError):
    from .....gitmanager.git.core.service import GitService
    git_service_available = True

# 표준화된 API 응답 모델 정의
class GitCommitRequest(BaseModel):
    message: str = Field(..., description="커밋 메시지")
    
class AddRequest(BaseModel):
    files: List[str] = Field(..., description="스테이징할 파일 경로 목록")
    
class BranchRequest(BaseModel):
    branch_name: str = Field(..., description="생성할 브랜치 이름")
    base_branch: Optional[str] = Field(None, description="기준 브랜치 (지정하지 않으면 현재 브랜치)")
    
class CheckoutRequest(BaseModel):
    branch_name: str = Field(..., description="체크아웃할 브랜치 이름")

class PullRequest(BaseModel):
    remote: str = Field("origin", description="원격 저장소 이름")
    branch: Optional[str] = Field(None, description="가져올 브랜치 (지정하지 않으면 현재 브랜치)")

class PushRequest(BaseModel):
    remote: str = Field("origin", description="원격 저장소 이름")
    branch: Optional[str] = Field(None, description="푸시할 브랜치 (지정하지 않으면 현재 브랜치)")
    force: bool = Field(False, description="강제 푸시 여부")

# Git API 라우터 생성
router = APIRouter(prefix="/git", tags=["Git 관리"])

# Git 서비스 제공자 함수
def get_git_service():
    """
    Git 서비스 인스턴스를 생성하고 반환합니다.
    설정에서 저장소 경로를 가져와 사용합니다.
    예외 발생 시 적절한 에러 예외로 변환합니다.
    """
    if not git_service_available:
        logger.error("Git 서비스를 사용할 수 없습니다. 필요한 패키지가 설치되어 있는지 확인하세요.")
        raise GitServiceUnavailableError(
            message="Git 서비스를 사용할 수 없습니다. 필요한 패키지가 설치되어 있는지 확인하세요.",
            details={"git_patch_available": git_patch_available}
        )
    
    try:
        repo_path = settings.GIT_REPO_PATH
        if not repo_path or not os.path.exists(repo_path):
            repo_path = os.getcwd()
            logger.warning(f"설정된 Git 저장소 경로가 유효하지 않아 현재 작업 디렉토리({repo_path})를 사용합니다.")
        
        # 저장소 존재 여부 확인
        if not os.path.exists(os.path.join(repo_path, ".git")):
            logger.error(f"유효한 Git 저장소가 아닙니다: {repo_path}")
            raise GitRepositoryNotFoundError(
                message=f"유효한 Git 저장소가 아닙니다: {repo_path}",
                details={"repository_path": repo_path}
            )
        
        return GitService(repo_path)
    except GitRepositoryNotFoundError:
        # 이미 적절한 예외로 변환됨
        raise
    except Exception as e:
        logger.error(f"Git 서비스 초기화 실패: {str(e)}")
        raise GitServiceError(
            message=f"Git 서비스 초기화 실패: {str(e)}",
            error_code=ErrorCode.GIT_SERVICE_UNAVAILABLE,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"repository_path": repo_path, "error": str(e)}
        )

# 작업 로그 기록 함수
def log_git_operation(
    db: Session,
    operation_type: GitOperationType,
    user: User,
    repository_path: str = None,
    status: GitOperationStatus = GitOperationStatus.SUCCESS,
    **kwargs
) -> GitOperationLog:
    """
    Git 작업 로그를 데이터베이스에 기록합니다.
    
    Args:
        db: 데이터베이스 세션
        operation_type: 작업 유형
        user: 사용자 객체
        repository_path: 저장소 경로 (기본값: 현재 작업 디렉토리)
        status: 작업 상태
        **kwargs: 추가 파라미터 (branch_name, commit_hash 등)
        
    Returns:
        생성된 GitOperationLog 객체
    """
    try:
        if repository_path is None:
            repository_path = os.getcwd()
            
        log = GitOperationLog(
            operation_type=operation_type,
            status=status,
            user_id=user.id if user else None,
            repository_path=repository_path,
            **kwargs
        )
        
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        db.rollback()
        print(f"Git 작업 로그 기록 실패: {str(e)}")
        # 로그 기록 실패는 API 응답에 영향을 주지 않도록 예외를 잡음
        return None

# 서비스 상태 확인 엔드포인트
@router.get("/status", summary="Git 서비스 상태 확인")
async def git_status():
    """
    Git 서비스 상태 및 가용성을 확인합니다.
    
    Returns:
        StandardResponse: 서비스 상태 정보
    """
    return success_response(
        message="Git 서비스 상태 조회 성공" if git_service_available else "Git 서비스를 사용할 수 없습니다",
        data={
            "status": "available" if git_service_available else "unavailable",
            "git_patch_available": git_patch_available,
            "git_service_available": git_service_available,
            "repo_path": settings.GIT_REPO_PATH,
            "version": settings.GIT_API_VERSION,
            "api_date": settings.API_VERSION_DATE
        }
    )

# 저장소 상태 조회
@router.get("/repo-status", summary="Git 저장소 상태 조회")
async def get_repo_status(use_cache: bool = Query(None, description="캐시 사용 여부")):
    """
    Git 저장소의 현재 상태를 조회합니다.
    변경된 파일, 추적되지 않는 파일, 현재 브랜치 등의 정보를 제공합니다.
    
    Parameters:
        use_cache (bool): 캐시 사용 여부 (기본값: 설정 파일의 값)
        
    Returns:
        StandardResponse: 저장소 상태 정보
    """
    try:
        git_service = get_git_service()
        
        # use_cache 파라미터가 None이면 설정 파일의 기본값 사용
        should_use_cache = use_cache if use_cache is not None else True
        cache_timeout = settings.GIT_CACHE_TIMEOUT
        
        if not should_use_cache:
            logger.debug("캐시 사용하지 않고 Git 저장소 상태 조회")
            
        repo_status = git_service.get_status(use_cache=should_use_cache, cache_timeout=cache_timeout)
        
        # 응답 구조화
        status_info = {
            "branch": repo_status.get("branch", ""),
            "clean": repo_status.get("modified_files", 0) == 0 and repo_status.get("untracked_files", 0) == 0,
            "modified_files": repo_status.get("modified_files", 0),
            "untracked_files": repo_status.get("untracked_files", 0),
            "last_commit": repo_status.get("last_commit", {}),
            "cached": should_use_cache,
            "cache_timeout": cache_timeout
        }
        
        return success_response(
            message="저장소 상태 조회 성공",
            data=status_info
        )
    except Exception as e:
        logger.error(f"저장소 상태 조회 실패: {str(e)}")
        return error_response(
            message="저장소 상태 조회 실패",
            errors=[{"code": ErrorCode.GIT_OPERATION_FAILED, "message": str(e)}]
        )

# 저장소 정보 조회
@router.get("/info", summary="저장소 정보 조회")
async def git_repo_info():
    """
    Git 저장소의 기본 정보를 조회합니다.
    저장소 이름, 상태, 브랜치 목록 등의 정보를 제공합니다.
    
    Returns:
        StandardResponse: 저장소 기본 정보
    """
    try:
        git_service = get_git_service()
        repo_status = git_service.get_status(use_cache=False)
        
        data = {
            "repository": os.path.basename(os.getcwd()),
            "status": repo_status,
            "branches": git_service._run_git_command(["branch", "--list"]),
            "is_git_repository": True
        }
        
        return StandardResponse(
            success=True,
            message="저장소 정보 조회 성공",
            data=data
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="저장소 정보 조회 실패",
            data={
                "repository": os.path.basename(os.getcwd()),
                "is_git_repository": False
            },
            errors=[{"detail": str(e)}]
        )

# 브랜치 목록 조회
@router.get("/branches", summary="브랜치 목록 조회")
async def get_branches():
    """
    Git 저장소의 브랜치 목록을 조회합니다.
    
    Returns:
        StandardResponse: 브랜치 목록 정보
    """
    try:
        git_service = get_git_service()
        branches = git_service.list_branches()
        
        return success_response(
            message="브랜치 목록 조회 성공",
            data={"branches": branches, "version": settings.GIT_API_VERSION}
        )
    except GitServiceError as e:
        # 이미 적절한 형태의 예외는 그대로 전파
        raise
    except Exception as e:
        logger.error(f"브랜치 목록 조회 실패: {str(e)}")
        return error_response(
            message="브랜치 목록 조회 실패",
            errors=[{
                "code": ErrorCode.GIT_OPERATION_FAILED,
                "message": str(e)
            }]
        )

# 커밋 이력 조회
@router.get("/commits", summary="커밋 이력 조회")
async def get_commits(
    limit: int = Query(10, ge=1, le=100, description="조회할 최대 커밋 수"),
    skip: int = Query(0, ge=0, description="건너뛸 커밋 수"),
    path: Optional[str] = Query(None, description="특정 파일 또는 디렉토리 경로"),
    use_cache: bool = Query(None, description="캐시 사용 여부")
):
    """
    Git 저장소의 커밋 이력을 조회합니다.
    
    Parameters:
        limit (int): 조회할 최대 커밋 수 (1-100)
        skip (int): 건너뛸 커밋 수
        path (str, optional): 특정 파일 또는 디렉토리 경로
        use_cache (bool): 캐시 사용 여부 (기본값: 설정 파일의 값)
        
    Returns:
        StandardResponse: 커밋 이력 목록
    """
    try:
        git_service = get_git_service()
        
        # use_cache 파라미터가 None이면 설정 파일의 기본값 사용
        should_use_cache = use_cache if use_cache is not None else True
        cache_timeout = settings.GIT_CACHE_TIMEOUT
        
        commits = git_service.get_commit_history(
            path=path, 
            limit=limit, 
            skip=skip, 
            use_cache=should_use_cache,
            cache_timeout=cache_timeout
        )
        
        # 짧은 커밋 해시 추가
        for commit in commits:
            if "hash" in commit:
                commit["short_hash"] = commit["hash"][:7]
        
        return success_response(
            message="커밋 이력 조회 성공",
            data={
                "commits": commits,
                "total": len(commits),
                "limit": limit,
                "skip": skip,
                "path": path,
                "cached": should_use_cache,
                "cache_timeout": cache_timeout,
                "version": settings.GIT_API_VERSION
            }
        )
    except GitServiceError as e:
        # 이미 적절한 형태의 예외는 그대로 전파
        raise
    except Exception as e:
        logger.error(f"커밋 이력 조회 실패: {str(e)}")
        return error_response(
            message="커밋 이력 조회 실패",
            errors=[{"code": ErrorCode.GIT_OPERATION_FAILED, "message": str(e)}]
        )

# 태그 목록 조회
@router.get("/tags", summary="태그 목록 조회")
async def get_tags():
    """
    Git 저장소의 태그 목록을 조회합니다.
    
    Returns:
        StandardResponse: 태그 목록
    """
    try:
        git_service = get_git_service()
        tags = git_service.list_tags()
        
        return StandardResponse(
            success=True,
            message="태그 목록 조회 성공",
            data={"tags": tags}
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="태그 목록 조회 실패",
            errors=[{"detail": str(e)}]
        )

# 파일 변경 내역(diff) 조회
@router.get("/diff", summary="파일 변경 내역 조회")
async def get_diff(
    file: str = Query(..., description="비교할 파일 경로"),
    current_user: User = Depends(get_current_active_user)
):
    """
    특정 파일의 작업 디렉토리와 HEAD 간의 변경사항을 조회합니다.
    
    Parameters:
        file (str): 비교할 파일 경로
        
    Returns:
        StandardResponse: 파일 경로와 변경 내역
    """
    try:
        git_service = get_git_service()
        command_result = git_service._run_git_command(["diff", "HEAD", "--", file])
        
        return StandardResponse(
            success=True,
            message="파일 변경 내역 조회 성공",
            data={
                "file": file, 
                "diff": command_result,
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="파일 변경 내역 조회 실패",
            errors=[{"detail": str(e)}]
        )

# 파일 변경 이력 조회
@router.get("/file-history", summary="파일 변경 이력 조회")
async def get_file_history(
    file_path: str = Query(..., description="조회할 파일 경로"),
    limit: int = Query(10, ge=1, le=50, description="조회할 최대 커밋 수"),
    current_user: User = Depends(get_current_active_user)
):
    """
    특정 파일의 변경 이력을 조회합니다.
    
    Parameters:
        file_path (str): 조회할 파일 경로
        limit (int): 조회할 최대 커밋 수 (1-50)
        
    Returns:
        StandardResponse: 파일 경로와 변경 이력
    """
    try:
        git_service = get_git_service()
        history = git_service.get_file_history(file_path)
        
        # 응답 구조화 및 제한
        entries = history.get("entries", [])[:limit] if history else []
        
        return StandardResponse(
            success=True,
            message="파일 변경 이력 조회 성공",
            data={
                "file_path": file_path,
                "history": entries,
                "total_entries": len(history.get("entries", [])) if history else 0
            }
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="파일 변경 이력 조회 실패",
            errors=[{"detail": str(e)}]
        )

# Git 설정 조회
@router.get("/config", summary="Git 설정 조회")
async def get_git_config(
    current_user: User = Depends(permission_required(ADMIN_READ_PERMISSION))
):
    """
    Git 설정을 조회합니다. 관리자 권한이 필요합니다.
    
    Returns:
        StandardResponse: Git 설정 정보
    """
    try:
        git_service = get_git_service()
        config = git_service._run_git_command(["config", "--list"])
        
        # 설정을 파싱하여 딕셔너리로 변환
        config_dict = {}
        for line in config.splitlines():
            if '=' in line:
                key, value = line.split('=', 1)
                config_dict[key] = value
        
        return StandardResponse(
            success=True,
            message="Git 설정 조회 성공",
            data={"config": config_dict}
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="Git 설정 조회 실패",
            errors=[{"detail": str(e)}]
        )

# 저장소 요약 정보 조회
@router.get("/summary", summary="저장소 요약 정보 조회")
async def get_repository_summary(request: Request):
    """
    Git 저장소의 요약 정보를 조회합니다.
    
    Returns:
        StandardResponse: 저장소 요약 정보
    """
    try:
        git_service = get_git_service()
        
        # 필요한 정보 수집
        status = git_service.get_status(use_cache=False)
        branches = git_service.list_branches()
        tags = git_service.list_tags()
        recent_commits = git_service.get_commit_history(limit=5)
        
        return StandardResponse(
            success=True,
            message="저장소 요약 정보 조회 성공",
            data={
                "name": os.path.basename(os.getcwd()),
                "current_branch": status.get("branch", ""),
                "is_clean": status.get("modified_files", 0) == 0 and status.get("untracked_files", 0) == 0,
                "branch_count": len(branches),
                "tag_count": len(tags),
                "recent_commits": recent_commits,
                "api_version": "1.0.0"
            }
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="저장소 요약 정보 조회 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 파일 스테이징 (git add)
@router.post("/add", summary="파일 스테이징")
async def stage_files(
    request: AddRequest,
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    지정한 파일들을 스테이징 영역에 추가합니다. (git add)
    
    Parameters:
        request (AddRequest): 스테이징할 파일 목록
        
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        files = request.files
        
        # 파일 존재 여부 확인
        for file in files:
            if not os.path.exists(os.path.join(os.getcwd(), file)):
                # 로그 기록 (실패)
                log_git_operation(
                    db=db,
                    operation_type=GitOperationType.ADD,
                    user=current_user,
                    status=GitOperationStatus.FAILURE,
                    details=f"스테이징할 파일 목록: {', '.join(files)}",
                    error_message=f"파일이 존재하지 않습니다: {file}"
                )
                
                return StandardResponse(
                    success=False,
                    message="파일 스테이징 실패",
                    errors=[{"detail": f"파일이 존재하지 않습니다: {file}"}]
                )
        
        # 파일 스테이징
        git_service._run_git_command(["add"] + files)
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.ADD,
            user=current_user,
            details=f"스테이징된 파일: {', '.join(files)}"
        )
        
        return StandardResponse(
            success=True,
            message="파일 스테이징 성공",
            data={
                "files": files,
                "result": "Files staged successfully"
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.ADD,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            details=f"스테이징할 파일 목록: {', '.join(files)}",
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="파일 스테이징 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 변경사항 커밋 (git commit)
@router.post("/commit", summary="변경사항 커밋")
async def commit_changes(
    request: GitCommitRequest,
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    스테이징된 변경사항을 커밋합니다. (git commit)
    
    Parameters:
        request (GitCommitRequest): 커밋 메시지
        
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        message = request.message
        
        # 스테이징된 변경사항 확인
        status = git_service.get_status(use_cache=False)
        if status.get("staged_files", 0) == 0:
            # 로그 기록 (실패)
            log_git_operation(
                db=db,
                operation_type=GitOperationType.COMMIT,
                user=current_user,
                status=GitOperationStatus.FAILURE,
                message=message,
                error_message="스테이징된 변경사항이 없습니다"
            )
            
            return StandardResponse(
                success=False,
                message="커밋 실패",
                errors=[{"detail": "스테이징된 변경사항이 없습니다"}]
            )
        
        # 커밋 실행
        result = git_service._run_git_command(["commit", "-m", message])
        
        # 커밋 해시 추출
        commit_hash = None
        for line in result.splitlines():
            if line.startswith("[") and "]" in line and "commit" in line:
                parts = line.split(" ")
                for part in parts:
                    if len(part) >= 7 and all(c in "0123456789abcdef" for c in part.lower()):
                        commit_hash = part
                        break
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.COMMIT,
            user=current_user,
            message=message,
            commit_hash=commit_hash
        )
        
        return StandardResponse(
            success=True,
            message="커밋 성공",
            data={
                "message": message,
                "result": result,
                "commit_hash": commit_hash
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.COMMIT,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            message=message,
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="커밋 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 스테이징 취소 (git reset)
@router.post("/reset", summary="스테이징 취소")
async def reset_staged(
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    스테이징된 모든 변경사항을 취소합니다. (git reset)
    
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        git_service._run_git_command(["reset"])
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.RESET,
            user=current_user,
            details="스테이징된 모든 변경사항 취소"
        )
        
        return StandardResponse(
            success=True,
            message="스테이징 취소 성공",
            data={
                "result": "All staged changes reset"
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.RESET,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="스테이징 취소 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 브랜치 생성 (git branch)
@router.post("/branch", summary="브랜치 생성")
async def create_branch(
    request: BranchRequest,
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    새로운 브랜치를 생성합니다. (git branch)
    
    Parameters:
        request (BranchRequest): 브랜치 생성 정보
        
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        branch_name = request.branch_name
        base_branch = request.base_branch
        
        if base_branch:
            git_service._run_git_command(["branch", branch_name, base_branch])
        else:
            git_service._run_git_command(["branch", branch_name])
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.BRANCH_CREATE,
            user=current_user,
            branch_name=branch_name,
            details=f"기준 브랜치: {base_branch or '현재 브랜치'}"
        )
        
        return StandardResponse(
            success=True,
            message="브랜치 생성 성공",
            data={
                "branch_name": branch_name,
                "base_branch": base_branch or "현재 브랜치",
                "result": f"브랜치 '{branch_name}'이(가) 생성되었습니다."
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.BRANCH_CREATE,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            branch_name=branch_name,
            details=f"기준 브랜치: {base_branch or '현재 브랜치'}",
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="브랜치 생성 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 브랜치 전환 (git checkout)
@router.post("/checkout", summary="브랜치 전환")
async def checkout_branch(
    request: CheckoutRequest,
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    다른 브랜치로 전환합니다. (git checkout)
    
    Parameters:
        request (CheckoutRequest): 전환할 브랜치 정보
        
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        branch_name = request.branch_name
        
        # 브랜치 존재 여부 확인
        branches = git_service.list_branches()
        if branch_name not in [b.get("name") for b in branches]:
            # 로그 기록 (실패)
            log_git_operation(
                db=db,
                operation_type=GitOperationType.CHECKOUT,
                user=current_user,
                status=GitOperationStatus.FAILURE,
                branch_name=branch_name,
                error_message=f"브랜치가 존재하지 않습니다: {branch_name}"
            )
            
            return StandardResponse(
                success=False,
                message="브랜치 전환 실패",
                errors=[{"detail": f"브랜치가 존재하지 않습니다: {branch_name}"}]
            )
        
        git_service._run_git_command(["checkout", branch_name])
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.CHECKOUT,
            user=current_user,
            branch_name=branch_name
        )
        
        return StandardResponse(
            success=True,
            message="브랜치 전환 성공",
            data={
                "branch_name": branch_name,
                "result": f"브랜치 '{branch_name}'(으)로 전환되었습니다."
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.CHECKOUT,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            branch_name=branch_name,
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="브랜치 전환 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 원격 저장소로부터 변경사항 가져오기 (git pull)
@router.post("/pull", summary="원격 저장소에서 변경사항 가져오기")
async def pull_changes(
    request: PullRequest = Body(PullRequest()),
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    원격 저장소에서 변경사항을 가져옵니다. (git pull)
    
    Parameters:
        request (PullRequest): 원격 저장소 및 브랜치 정보
        
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        remote = request.remote
        branch = request.branch
        
        cmd = ["pull", remote]
        if branch:
            cmd.append(branch)
        
        result = git_service._run_git_command(cmd)
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.PULL,
            user=current_user,
            details=f"원격 저장소: {remote}, 브랜치: {branch or '현재 브랜치'}"
        )
        
        return StandardResponse(
            success=True,
            message="원격 저장소에서 변경사항 가져오기 성공",
            data={
                "remote": remote,
                "branch": branch,
                "result": result
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.PULL,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            details=f"원격 저장소: {remote}, 브랜치: {branch or '현재 브랜치'}",
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="원격 저장소에서 변경사항 가져오기 실패",
            errors=[{"detail": str(e)}]
        )

# [쓰기 작업] 원격 저장소로 변경사항 푸시하기 (git push)
@router.post("/push", summary="원격 저장소로 변경사항 푸시하기")
async def push_changes(
    request: PushRequest = Body(PushRequest()),
    current_user: User = Depends(permission_required(GIT_WRITE_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    원격 저장소로 변경사항을 푸시합니다. (git push)
    
    Parameters:
        request (PushRequest): 원격 저장소 및 브랜치 정보
        
    Returns:
        StandardResponse: 작업 결과
    """
    try:
        git_service = get_git_service()
        remote = request.remote
        branch = request.branch
        force = request.force
        
        cmd = ["push", remote]
        if branch:
            cmd.append(branch)
        if force:
            cmd.append("--force")
        
        result = git_service._run_git_command(cmd)
        
        # 로그 기록 (성공)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.PUSH,
            user=current_user,
            details=f"원격 저장소: {remote}, 브랜치: {branch or '현재 브랜치'}, 강제 푸시: {force}"
        )
        
        return StandardResponse(
            success=True,
            message="원격 저장소로 변경사항 푸시 성공",
            data={
                "remote": remote,
                "branch": branch,
                "force": force,
                "result": result
            }
        )
    except Exception as e:
        # 로그 기록 (실패)
        log_git_operation(
            db=db,
            operation_type=GitOperationType.PUSH,
            user=current_user,
            status=GitOperationStatus.FAILURE,
            details=f"원격 저장소: {remote}, 브랜치: {branch or '현재 브랜치'}, 강제 푸시: {force}",
            error_message=str(e)
        )
        
        return StandardResponse(
            success=False,
            message="원격 저장소로 변경사항 푸시 실패",
            errors=[{"detail": str(e)}]
        )

# Git 작업 로그 조회 (관리자용)
@router.get("/logs", summary="Git 작업 로그 조회")
async def get_operation_logs(
    limit: int = Query(20, ge=1, le=100, description="조회할 최대 로그 수"),
    skip: int = Query(0, ge=0, description="건너뛸 로그 수"),
    operation_type: Optional[str] = Query(None, description="필터링할 작업 유형"),
    current_user: User = Depends(permission_required(ADMIN_READ_PERMISSION)),
    db: Session = Depends(get_db)
):
    """
    Git 작업 로그 목록을 조회합니다. 관리자 권한이 필요합니다.
    
    Parameters:
        limit (int): 조회할 최대 로그 수 (1-100)
        skip (int): 건너뛸 로그 수
        operation_type (str, optional): 필터링할 작업 유형
        
    Returns:
        StandardResponse: 작업 로그 목록
    """
    try:
        # 쿼리 구성
        query = db.query(GitOperationLog)
        
        # 필터링
        if operation_type:
            try:
                op_type = GitOperationType(operation_type)
                query = query.filter(GitOperationLog.operation_type == op_type)
            except ValueError:
                pass
                
        # 전체 개수 조회
        total_count = query.count()
        
        # 결과 제한 및 정렬
        logs = query.order_by(GitOperationLog.created_at.desc()) \
            .offset(skip) \
            .limit(limit) \
            .all()
        
        # 결과 변환
        log_list = []
        for log in logs:
            log_dict = {
                "id": log.id,
                "operation_type": log.operation_type,
                "status": log.status,
                "user_id": log.user_id,
                "repository_path": log.repository_path,
                "branch_name": log.branch_name,
                "commit_hash": log.commit_hash,
                "message": log.message,
                "details": log.details,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat()
            }
            log_list.append(log_dict)
        
        return StandardResponse(
            success=True,
            message="Git 작업 로그 조회 성공",
            data={
                "logs": log_list,
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "operation_type": operation_type
            }
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            message="Git 작업 로그 조회 실패",
            errors=[{"detail": str(e)}]
        )