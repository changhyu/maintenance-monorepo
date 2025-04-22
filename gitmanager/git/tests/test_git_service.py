"""
Git 서비스 테스트 모듈

Git 서비스의 기능을 테스트하는 테스트 케이스를 포함합니다.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

import pytest

from gitmanager.git.core.exceptions import (
    GitBranchException,
    GitCommandException,
    GitCommitException,
    GitMergeException,
    GitException,
    GitPushPullException,
    GitRepositoryException,
    GitTagException,
)
from gitmanager.git.core.types import (
    BranchInfo,
    CommitComparison,
    CommitResponse,
    FileHistory,
    GitStatusResult,
    MergeConflictResult,
    PullPushResult,
    PullPushResultWithChanges,
    TagInfo,
)
from gitmanager.services.git_service import GitService


class TestGitService:
    """Git 서비스 테스트 클래스"""

    @pytest.fixture
    def temp_repo(self):
        """임시 Git 저장소를 생성하는 fixture"""
        temp_dir = tempfile.mkdtemp()
        try:
            yield Path(temp_dir)
        finally:
            shutil.rmtree(temp_dir)

    @pytest.fixture
    def git_service(self, temp_repo):
        """GitService 인스턴스를 생성하는 fixture"""
        with patch(
            "gitmanager.git.services.git_service.is_git_installed", return_value=True
        ), patch(
            "gitmanager.git.services.git_service.is_git_repository", return_value=True
        ):
            return GitService(temp_repo)

    def test_get_status(self, git_service):
        """저장소 상태 조회 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.side_effect = [
                " M file1.txt\n M file2.txt",  # status
                "main",  # current_branch
                "abc123|Author|author@example.com|Test commit|2024-01-01",  # last_commit
            ]

            result = git_service.get_status()

            assert isinstance(result, dict)
            assert result["branch"] == "main"
            assert result["modified_files"] == 2
            assert result["last_commit"]["hash"] == "abc123"

    def test_create_commit(self, git_service):
        """커밋 생성 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.side_effect = [
                "Success",  # add
                "[main abc123] Test commit",  # commit result
            ]

            result = git_service.create_commit("Test commit")

            assert isinstance(result, str)
            assert result == "abc123]"

    def test_pull(self, git_service):
        """Pull 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.return_value = "Pull completed successfully"

            result = git_service.pull()

            assert isinstance(result, dict)
            assert result["success"] is True
            assert result["details"] == "Pull completed successfully"

    def test_push(self, git_service):
        """Push 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.return_value = "Successfully pushed changes"

            result = git_service.push()

            assert isinstance(result, str)
            assert result == "Successfully pushed changes"

    def test_resolve_merge_conflicts(self, git_service):
        """병합 충돌 해결 테스트"""
        with patch.object(
            git_service, "_get_conflict_files"
        ) as mock_conflicts, patch.object(git_service, "_run_git_command") as mock_run:
            mock_conflicts.return_value = ["file1.txt", "file2.txt"]
            mock_run.return_value = "Success"

            result = git_service.resolve_merge_conflicts()

            assert isinstance(result, dict)
            assert result["success"] is True
            assert result["conflict"] is True
            assert len(result["resolved_files"]) == 2

    def test_create_branch(self, git_service):
        """브랜치 생성 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run, patch.object(
            git_service, "_get_branch_info"
        ) as mock_info:
            mock_run.return_value = "Success"
            mock_info.return_value = {
                "name": "feature/test",
                "is_current": False,
                "is_remote": False,
                "tracking": None,
                "last_commit": None,
            }

            result = git_service.create_branch("feature/test")

            assert isinstance(result, dict)
            assert result["name"] == "feature/test"

    def test_delete_branch(self, git_service):
        """브랜치 삭제 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.return_value = "Success"

            result = git_service.delete_branch("feature/test")

            assert result is True

    def test_switch_branch(self, git_service):
        """브랜치 전환 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run, patch.object(
            git_service, "_get_branch_info"
        ) as mock_info:
            mock_run.return_value = "Success"
            mock_info.return_value = {
                "name": "feature/test",
                "is_current": True,
                "is_remote": False,
                "tracking": None,
                "last_commit": None,
            }

            result = git_service.switch_branch("feature/test")

            assert isinstance(result, dict)
            assert result["name"] == "feature/test"
            assert result["is_current"] is True

    def test_list_branches(self, git_service):
        """브랜치 목록 조회 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.side_effect = [
                "main",  # current branch
                "origin/main",  # tracking branch
                "abc123|Author|author@example.com|Test commit|2024-01-01",  # commit info
                "feature/test",  # current branch
                "",  # tracking branch (empty)
                "def456|Author|author@example.com|Feature commit|2024-01-02",  # commit info
            ]

            result = git_service.list_branches()

            assert isinstance(result, list)
            assert len(result) == 2
            assert result[0]["name"] == "main"

    def test_create_tag(self, git_service):
        """태그 생성 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run, patch.object(
            git_service, "_get_tag_info"
        ) as mock_info:
            mock_run.return_value = "Success"
            mock_info.return_value = {
                "name": "v1.0.0",
                "commit": "abc123",
                "message": "Release 1.0.0",
                "date": "2024-01-01",
                "author": "Author",
            }

            result = git_service.create_tag("v1.0.0", "Release 1.0.0")

            assert isinstance(result, dict)
            assert result["name"] == "v1.0.0"
            assert result["message"] == "Release 1.0.0"

    def test_delete_tag(self, git_service):
        """태그 삭제 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.return_value = "Success"

            result = git_service.delete_tag("v1.0.0")

            assert result is True

    def test_list_tags(self, git_service):
        """태그 목록 조회 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.side_effect = [
                "abc123|Release 1.0.0|2024-01-01|Author",  # tag info
                "def456|Release 1.1.0|2024-01-02|Author",  # tag info
            ]

            result = git_service.list_tags()

            assert isinstance(result, list)
            assert len(result) == 2
            assert result[0]["name"] == "v1.0.0"

    def test_get_file_history(self, git_service):
        """파일 변경 이력 조회 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.side_effect = [
                "abc123|Author|author@example.com|Test commit|2024-01-01",
                "2\t1\tfile.txt",
                "diff content",
            ]

            result = git_service.get_file_history("file.txt")

            assert isinstance(result, dict)
            assert result["file"] == "file.txt"
            assert len(result["commits"]) == 1
            assert result["commits"][0]["hash"] == "abc123"

    def test_get_changes_between_commits(self, git_service):
        """커밋 간 변경사항 조회 테스트"""
        with patch.object(git_service, "_run_git_command") as mock_run:
            mock_run.side_effect = ["M\tfile.txt", "2\t1\tfile.txt", "diff content"]

            result = git_service.get_changes_between_commits("abc123", "def456")

            assert isinstance(result, dict)
            assert result["from_commit"] == "abc123"
            assert result["to_commit"] == "def456"
            assert len(result["changes"]) == 1
            assert result["changes"][0]["file"] == "file.txt"
            assert result["changes"][0]["status"] == "M"
