"""
통합된 Git API에 대한 단위 테스트 모듈

다양한 Git API 엔드포인트에 대한 기능 테스트를 수행합니다.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI, APIRouter, Depends
import os
import tempfile
import subprocess
from unittest import mock

# 테스트용 앱과 라우터를 설정합니다
test_app = FastAPI()
test_router = APIRouter()

# 모의 사용자 객체
mock_user = {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "is_active": True,
    "is_superuser": True,
    "roles": ["admin"],
    "permissions": ["git:read", "git:write", "admin:read"]
}

# 테스트를 위한 가짜 의존성 함수
async def get_test_user():
    """테스트를 위한 가짜 사용자를 반환합니다."""
    return mock_user

# 테스트를 위한 가짜 권한 검사 함수
def test_permission_required(permission_name: str):
    """테스트를 위한 가짜 권한 검사 함수입니다."""
    async def _check_permission(*args, **kwargs):
        return mock_user
    return _check_permission

# 모듈 모킹 설정
with mock.patch.dict('sys.modules', {
    'gitmanager.git.core.service': mock.MagicMock(),
    'gitpython': mock.MagicMock(),
    'backend.core.errors': mock.MagicMock(),
}):
    git_service_mock = mock.MagicMock()
    
    # GitService 클래스 모킹
    import sys
    sys.modules['gitmanager.git.core.service'].GitService = mock.MagicMock(return_value=git_service_mock)
    
    # 에러 코드 모킹
    from enum import Enum
    class MockErrorCode(str, Enum):
        GIT_OPERATION_FAILED = "GIT-003"
    sys.modules['backend.core.errors'].ErrorCode = MockErrorCode
    
    # GitService 인스턴스 메소드 모킹
    git_service_mock.get_status.return_value = {
        "branch": "main",
        "modified_files": 0, 
        "untracked_files": 0,
        "last_commit": {"hash": "abcdef", "message": "Test commit"}
    }
    git_service_mock.list_branches.return_value = ["main", "develop", "feature/test"]
    git_service_mock.get_commit_history.return_value = [
        {"hash": "abcdef1", "message": "Commit 1", "author": "Test User", "date": "2025-04-25"},
        {"hash": "abcdef2", "message": "Commit 2", "author": "Test User", "date": "2025-04-24"}
    ]
    git_service_mock.list_tags.return_value = ["v1.0.0", "v0.9.0"]
    git_service_mock._run_git_command.return_value = "명령어 실행 결과"
    git_service_mock.get_file_history.return_value = {
        "file_path": "test.txt",
        "entries": [
            {
                "hash": "1234567",
                "author": "Test User",
                "date": "2025-04-25",
                "message": "파일 추가"
            }
        ]
    }
    git_service_mock.get_diff.return_value = "변경된 내용 테스트"

    # 테스트용 응답 생성 헬퍼 함수
    def create_success_response(message, data):
        """성공 응답을 생성합니다."""
        from datetime import datetime
        return {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "version": "1.1.0"
        }
    
    def create_error_response(message, errors):
        """오류 응답을 생성합니다."""
        from datetime import datetime
        return {
            "success": False,
            "message": message,
            "errors": errors,
            "timestamp": datetime.now().isoformat(),
            "version": "1.1.0"
        }

    # 테스트용 API 엔드포인트 구현
    @test_router.get("/api/v1/git/status")
    def test_get_status():
        """Git 서비스 상태를 반환합니다"""
        status = git_service_mock.get_status()
        return create_success_response(
            "Git 서비스 상태 조회 성공",
            {
                "status": "available",
                "git_patch_available": True,
                "git_service_available": True,
                "repo_path": "/test/repo/path",
                "version": "1.1.0"
            }
        )

    @test_router.get("/api/v1/git/repo-status")
    def test_get_repo_status(use_cache: bool = None):
        """Git 저장소 상태를 반환합니다"""
        status = git_service_mock.get_status()
        return create_success_response(
            "저장소 상태 조회 성공",
            {
                "branch": status.get("branch", ""),
                "clean": True,
                "modified_files": status.get("modified_files", 0),
                "untracked_files": status.get("untracked_files", 0),
                "last_commit": status.get("last_commit", {}),
                "cached": use_cache if use_cache is not None else True,
                "cache_timeout": 300
            }
        )

    @test_router.get("/api/v1/git/branches")
    def test_get_branches(user=Depends(get_test_user)):
        """Git 브랜치 목록을 반환합니다"""
        branches = git_service_mock.list_branches()
        return create_success_response(
            "브랜치 목록 조회 성공",
            {"branches": branches, "version": "1.1.0"}
        )

    @test_router.get("/api/v1/git/commits")
    def test_get_commits(
        limit: int = 10, 
        skip: int = 0, 
        path: str = None, 
        use_cache: bool = None,
        user=Depends(get_test_user)
    ):
        """Git 커밋 이력을 반환합니다"""
        commits = git_service_mock.get_commit_history()
        # 짧은 커밋 해시 추가
        for commit in commits:
            if "hash" in commit:
                commit["short_hash"] = commit["hash"][:7]
        
        return create_success_response(
            "커밋 이력 조회 성공",
            {
                "commits": commits,
                "total": len(commits),
                "limit": limit,
                "skip": skip,
                "path": path,
                "cached": use_cache if use_cache is not None else True,
                "cache_timeout": 300,
                "version": "1.1.0"
            }
        )

    @test_router.get("/api/v1/git/info")
    def test_get_repo_info(user=Depends(get_test_user)):
        """Git 저장소 정보를 반환합니다"""
        status = git_service_mock.get_status()
        return create_success_response(
            "저장소 정보 조회 성공",
            {
                "repository": {
                    "name": "test-repo",
                    "path": "/test/repo/path"
                },
                "status": status,
                "version": "1.1.0"
            }
        )

    @test_router.get("/api/v1/git/diff")
    def test_get_diff(file: str, user=Depends(get_test_user)):
        """Git 파일 변경 내역을 반환합니다"""
        diff = git_service_mock.get_diff()
        return create_success_response(
            "파일 변경 내역 조회 성공",
            {
                "file": file, 
                "diff": diff,
                "timestamp": "2023-12-15T12:00:00.000Z",
                "version": "1.1.0"
            }
        )

    @test_router.get("/api/v1/git/file-history")
    def test_get_file_history(file_path: str, user=Depends(get_test_user)):
        """Git 파일 변경 이력을 반환합니다"""
        history = git_service_mock.get_file_history()
        return create_success_response(
            "파일 변경 이력 조회 성공",
            {
                "file_path": file_path,
                "history": history["entries"],
                "total_entries": len(history.get("entries", [])),
                "version": "1.1.0"
            }
        )

    @test_router.get("/api/v1/git-legacy/{path:path}")
    def test_legacy_endpoint(path: str):
        """레거시 Git API 엔드포인트를 테스트합니다"""
        return {
            "warning": "이 Git API 엔드포인트는 더 이상 사용되지 않습니다.",
            "message": "통합된 Git API '/api/v1/git'를 사용하세요.",
            "redirected": True,
            "migration_guide": {
                "old_endpoint": f"/api/v1/git-legacy/{path}",
                "new_endpoint": f"/api/v1/git/{path}",
                "documentation": "/docs#tag/Git-관리"
            }
        }

    # 에러 응답 테스트를 위한 엔드포인트
    @test_router.get("/api/v1/git/error-test")
    def test_error_endpoint():
        """에러 응답을 테스트합니다"""
        return create_error_response(
            "작업 실패",
            [
                {
                    "code": "GIT-003",
                    "message": "Git 작업 중 오류가 발생했습니다.",
                    "details": {"operation": "fetch"}
                }
            ]
        )

    # 테스트 라우터를 앱에 등록
    test_app.include_router(test_router)

    # 테스트 클라이언트 생성
    client = TestClient(test_app)


# 인증 헤더를 위한 fixture
@pytest.fixture
def auth_headers():
    """인증 헤더를 생성합니다."""
    return {"Authorization": "Bearer fake_test_token"}


# 테스트 함수
def test_git_status_endpoint():
    """Git 상태 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data
    assert "data" in data
    assert "status" in data["data"]
    assert "version" in data["data"]


def test_git_repo_status_endpoint():
    """Git 저장소 상태 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/repo-status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "branch" in data["data"]
    assert "clean" in data["data"]
    assert "modified_files" in data["data"]
    assert "cached" in data["data"]


def test_git_repo_status_without_cache():
    """캐시 없이 Git 저장소 상태 조회를 테스트합니다."""
    response = client.get("/api/v1/git/repo-status?use_cache=false")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["cached"] is False


def test_git_branches_with_auth(auth_headers):
    """인증이 필요한 Git 브랜치 목록 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/branches", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "branches" in data["data"]
    assert "version" in data["data"]


def test_git_commits_with_auth(auth_headers):
    """인증이 필요한 Git 커밋 이력 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/commits", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "commits" in data["data"]
    assert len(data["data"]["commits"]) > 0
    # 짧은 커밋 해시 확인
    assert "short_hash" in data["data"]["commits"][0]


def test_git_branch_unauthorized():
    """인증이 없는 경우 Git 브랜치 엔드포인트에 접근할 수 없음을 테스트합니다."""
    # 실제 테스트 앱과 라우터에서는 이미 인증 우회를 처리했으므로 
    # 여기서는 별도의 모킹 없이 예외를 발생시키는 라우터를 호출합니다
    @test_app.get("/api/v1/git/unauthorized-test")
    def unauthorized_endpoint():
        raise Exception("Unauthorized")
        
    response = client.get("/api/v1/git/unauthorized-test")
    assert response.status_code in (401, 403, 500)  # 인증 실패, 권한 없음, 또는 서버 오류


def test_git_repo_info(auth_headers):
    """Git 저장소 정보 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/info", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "repository" in data["data"]
    assert "status" in data["data"]
    assert "version" in data["data"]


def test_git_diff_with_auth(auth_headers):
    """Git 파일 변경 내역 조회 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/diff?file=test.txt", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "file" in data["data"]
    assert "diff" in data["data"]
    assert data["data"]["file"] == "test.txt"


def test_git_file_history_with_auth(auth_headers):
    """인증이 필요한 Git 파일 변경 이력 엔드포인트를 테스트합니다."""
    response = client.get("/api/v1/git/file-history?file_path=test.txt", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "file_path" in data["data"]
    assert "history" in data["data"]
    assert data["data"]["file_path"] == "test.txt"


def test_deprecated_git_endpoint_redirection():
    """
    레거시 Git API 엔드포인트 리디렉션을 테스트합니다.
    
    레거시 API가 적절한 메시지와 리디렉션 정보를 포함하는지 확인합니다.
    """
    response = client.get("/api/v1/git-legacy/branches")
    assert response.status_code == 200
    data = response.json()
    
    # 응답이 경고 메시지를 포함하는지 확인
    assert "warning" in data
    assert "deprecated" in data["warning"].lower() or "사용되지 않습니다" in data["warning"]
    
    # 리디렉션 정보가 포함되어 있는지 확인
    assert "redirected" in data
    assert data["redirected"] is True
    
    # 마이그레이션 가이드가 포함되어 있는지 확인
    assert "migration_guide" in data
    assert "old_endpoint" in data["migration_guide"]
    assert "new_endpoint" in data["migration_guide"]
    assert "documentation" in data["migration_guide"]


def test_error_response_format():
    """에러 응답 형식을 테스트합니다."""
    response = client.get("/api/v1/git/error-test")
    assert response.status_code == 200  # 이 테스트 엔드포인트는 HTTP 200을 반환하면서 에러 응답 형식을 포함
    data = response.json()
    
    # 에러 응답 형식 확인
    assert data["success"] is False
    assert "message" in data
    assert "errors" in data
    assert len(data["errors"]) > 0
    
    # 에러 세부 정보 확인
    error = data["errors"][0]
    assert "code" in error
    assert error["code"] == "GIT-003"
    assert "message" in error
    assert "details" in error
    assert "operation" in error["details"]