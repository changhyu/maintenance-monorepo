"""
Git API 통합 테스트
"""
import pytest
from unittest.mock import patch, MagicMock
import os
import json

# Git 서비스 패치용 모의 객체
class MockGitService:
    def __init__(self, *args, **kwargs):
        pass
        
    def get_status(self, use_cache=True):
        return {
            "branch": "main",
            "modified_files": 2,
            "untracked_files": 1,
            "last_commit": {
                "hash": "abc1234",
                "author": "Test User",
                "message": "Test commit",
                "date": "2025-04-25T10:00:00"
            }
        }
        
    def list_branches(self):
        return [
            {"name": "main", "current": True, "remote": False},
            {"name": "develop", "current": False, "remote": False},
            {"name": "feature/test", "current": False, "remote": False}
        ]
        
    def get_commit_history(self, path=None, limit=10, skip=0):
        commits = [
            {
                "hash": "abc1234",
                "author": "Test User",
                "email": "test@example.com",
                "message": "Test commit 1",
                "date": "2025-04-25T10:00:00",
                "timestamp": 1619344800
            },
            {
                "hash": "def5678",
                "author": "Another User",
                "email": "another@example.com",
                "message": "Test commit 2",
                "date": "2025-04-24T09:00:00",
                "timestamp": 1619254800
            }
        ]
        
        if path:
            # 특정 파일에 대한 히스토리는 한 개만 반환
            return [commits[0]]
        
        return commits[:limit]
        
    def list_tags(self):
        return [
            {"name": "v1.0.0", "commit": "abc1234", "date": "2025-04-25T10:00:00"},
            {"name": "v0.9.0", "commit": "def5678", "date": "2025-04-24T09:00:00"}
        ]
        
    def get_file_history(self, file_path):
        return {
            "file_path": file_path,
            "entries": [
                {
                    "commit": "abc1234",
                    "author": "Test User",
                    "date": "2025-04-25T10:00:00",
                    "message": "Modified file"
                }
            ]
        }
        
    def _run_git_command(self, args):
        # 다양한 Git 명령어 결과 시뮬레이션
        if "diff" in args:
            return "+ This is a test diff\n- Old line\n+ New line"
        elif "config" in args and "--list" in args:
            return "user.name=Test User\nuser.email=test@example.com\ncore.editor=vim"
        return ""

# 테스트 함수
@pytest.mark.parametrize("endpoint,expected_status", [
    ("/api/v1/git/status", 200),
    ("/api/v1/git/repo-status", 200),
    ("/api/v1/git/info", 200),
    ("/api/v1/git/branches", 200),
    ("/api/v1/git/commits", 200),
    ("/api/v1/git/tags", 200),
    ("/api/v1/git/summary", 200),
])
@patch("backend.api.v1.endpoints.git_unified.git_service_available", True)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
def test_git_api_endpoints(client, admin_headers, endpoint, expected_status):
    """Git API 엔드포인트 기본 접근성 테스트"""
    response = client.get(endpoint, headers=admin_headers)
    assert response.status_code == expected_status
    # 응답에 필요한 필드가 있는지 확인
    assert "status" in response.json() or "branch" in response.json() or "branches" in response.json() or "commits" in response.json() or "tags" in response.json()

@patch("backend.api.v1.endpoints.git_unified.git_service_available", True)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
def test_repo_status_details(client, admin_headers):
    """Git 저장소 상태 세부 정보 테스트"""
    response = client.get("/api/v1/git/repo-status", headers=admin_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "branch" in data
    assert data["branch"] == "main"
    assert "modified_files" in data
    assert data["modified_files"] == 2
    # 저장소가 깨끗하지 않은지 확인
    assert "clean" in data
    assert data["clean"] is False

@patch("backend.api.v1.endpoints.git_unified.git_service_available", True)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
def test_commit_history(client, admin_headers):
    """커밋 히스토리 조회 테스트"""
    response = client.get("/api/v1/git/commits?limit=1", headers=admin_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "commits" in data
    assert len(data["commits"]) == 1
    
    commit = data["commits"][0]
    assert "hash" in commit
    assert "author" in commit
    assert "message" in commit
    assert "date" in commit

@patch("backend.api.v1.endpoints.git_unified.git_service_available", True)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
def test_file_history(client, admin_headers):
    """파일 히스토리 조회 테스트"""
    response = client.get("/api/v1/git/file-history?file_path=test.py", headers=admin_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "file_path" in data
    assert data["file_path"] == "test.py"
    assert "history" in data

@patch("backend.api.v1.endpoints.git_unified.git_service_available", True)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
def test_diff(client, admin_headers):
    """파일 변경 내역(diff) 조회 테스트"""
    response = client.get("/api/v1/git/diff?file=test.py", headers=admin_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "file" in data
    assert data["file"] == "test.py"
    assert "diff" in data
    assert "+" in data["diff"]  # diff 포맷에는 + 문자가 포함되어야 함

@patch("backend.api.v1.endpoints.git_unified.git_service_available", False)
def test_service_unavailable(client, admin_headers):
    """Git 서비스 사용 불가 시 오류 응답 테스트"""
    response = client.get("/api/v1/git/repo-status", headers=admin_headers)
    assert response.status_code == 503
    
    data = response.json()
    assert "detail" in data
    assert "Git 서비스를 사용할 수 없습니다" in data["detail"]
