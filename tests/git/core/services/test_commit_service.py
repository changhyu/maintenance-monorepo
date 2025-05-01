"""
GitCommitService 클래스에 대한 단위 테스트
"""
import os
import unittest
from unittest.mock import patch, MagicMock

from gitmanager.git.core.services.commit_service import GitCommitService
from gitmanager.git.core.exceptions import GitCommandException, GitCommitException
from gitmanager.git.core.types import CommitResult, CommitInfo


class TestGitCommitService(unittest.TestCase):
    """GitCommitService 클래스에 대한 테스트 케이스"""

    @patch('gitmanager.git.core.services.base_service.is_git_installed')
    @patch('gitmanager.git.core.services.base_service.CacheManager')
    def setUp(self, mock_cache_manager, mock_is_git_installed):
        """테스트 셋업"""
        mock_is_git_installed.return_value = True
        self.mock_cache_manager = mock_cache_manager.return_value
        self.test_repo_path = '/tmp/test_repo'
        self.service = GitCommitService(repo_path=self.test_repo_path)

    def test_init(self):
        """초기화 테스트"""
        self.assertEqual(self.service.repo_path, self.test_repo_path)
        self.assertFalse(self.service.bare)

    @patch.object(GitCommitService, '_run_git_command')
    @patch.object(GitCommitService, '_invalidate_repo_cache')
    def test_commit_success(self, mock_invalidate_cache, mock_run_git_command):
        """커밋 성공 테스트"""
        # Git add 및 commit 명령어에 대한 응답 모의 설정
        mock_run_git_command.side_effect = [
            "",  # add --all 명령의 출력
            "[main abcd1234] 테스트 커밋 메시지",  # commit 명령의 출력
            "abcd1234|테스트 작성자|author@example.com|테스트 커밋 메시지|2023-05-20T10:00:00|",  # show 명령의 출력 (get_commit)
            ""  # show --name-status 명령의 출력
        ]

        # 커밋 실행
        result = self.service.commit(
            message="테스트 커밋 메시지",
            add_all=True
        )

        # 결과 검증
        self.assertTrue(result.success)
        self.assertIsNotNone(result.commit)
        self.assertEqual(result.commit["message"], "테스트 커밋 메시지")
        self.assertEqual(result.commit["hash"], "abcd1234")
        
        # 호출 검증
        mock_invalidate_cache.assert_called_once()
        mock_run_git_command.assert_any_call(["add", "--all"])
        mock_run_git_command.assert_any_call(["commit", "-m", "테스트 커밋 메시지"])

    @patch.object(GitCommitService, '_run_git_command')
    @patch.object(GitCommitService, '_invalidate_repo_cache')
    def test_commit_with_specific_files(self, mock_invalidate_cache, mock_run_git_command):
        """특정 파일만 커밋하는 테스트"""
        # Git add 및 commit 명령어에 대한 응답 모의 설정
        mock_run_git_command.side_effect = [
            "",  # add 명령의 출력
            "[main abcd1234] 특정 파일 커밋",  # commit 명령의 출력
            "abcd1234|테스트 작성자|author@example.com|특정 파일 커밋|2023-05-20T10:00:00|",  # show 명령의 출력 (get_commit)
            ""  # show --name-status 명령의 출력
        ]

        # 커밋할 파일 목록
        files = ["file1.txt", "file2.txt"]

        # 커밋 실행
        result = self.service.commit(
            message="특정 파일 커밋",
            add_all=False,
            files=files
        )

        # 결과 검증
        self.assertTrue(result.success)
        self.assertIsNotNone(result.commit)
        
        # 호출 검증
        mock_invalidate_cache.assert_called_once()
        mock_run_git_command.assert_any_call(["add"] + files)
        mock_run_git_command.assert_any_call(["commit", "-m", "특정 파일 커밋"])

    @patch.object(GitCommitService, '_run_git_command')
    @patch.object(GitCommitService, '_invalidate_repo_cache')
    def test_commit_with_author(self, mock_invalidate_cache, mock_run_git_command):
        """작성자 정보를 포함한 커밋 테스트"""
        # Git add 및 commit 명령어에 대한 응답 모의 설정
        mock_run_git_command.side_effect = [
            "",  # add 명령의 출력
            "[main abcd1234] 작성자 지정 커밋",  # commit 명령의 출력
            "abcd1234|Custom Author|custom@example.com|작성자 지정 커밋|2023-05-20T10:00:00|",  # show 명령의 출력
            ""  # show --name-status 명령의 출력
        ]

        # 커밋 실행
        result = self.service.commit(
            message="작성자 지정 커밋",
            add_all=True,
            author="Custom Author",
            email="custom@example.com"
        )

        # 결과 검증
        self.assertTrue(result.success)
        self.assertIsNotNone(result.commit)
        self.assertEqual(result.commit["author"], "Custom Author")
        self.assertEqual(result.commit["email"], "custom@example.com")
        
        # 호출 검증
        mock_run_git_command.assert_any_call(["commit", "-m", "작성자 지정 커밋", "--author", "Custom Author <custom@example.com>"])

    @patch.object(GitCommitService, '_run_git_command')
    def test_commit_empty_message(self, mock_run_git_command):
        """빈 커밋 메시지 테스트"""
        # 커밋 실행
        result = self.service.commit(message="")

        # 결과 검증
        self.assertFalse(result.success)
        self.assertIn("커밋 메시지는 비어있을 수 없습니다", result.error)
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()

    @patch.object(GitCommitService, '_run_git_command')
    @patch.object(GitCommitService, '_invalidate_repo_cache')
    def test_commit_nothing_to_commit(self, mock_invalidate_cache, mock_run_git_command):
        """커밋할 내용이 없는 경우 테스트"""
        # add 명령은 성공하지만 commit 명령은 실패하는 상황 설정
        mock_run_git_command.side_effect = [
            "",  # add 명령의 출력
            GitCommandException("nothing to commit, working tree clean")  # commit 명령의 예외
        ]

        # 커밋 실행
        result = self.service.commit(message="테스트 커밋", add_all=True)

        # 결과 검증
        self.assertFalse(result.success)
        self.assertIn("커밋할 변경사항이 없습니다", result.error)

    @patch.object(GitCommitService, '_run_git_command')
    def test_get_commit(self, mock_run_git_command):
        """커밋 정보 조회 테스트"""
        # 캐시 미스 시뮬레이션
        self.mock_cache_manager.get.return_value = (False, None)
        
        # Git show 명령어에 대한 응답 모의 설정
        mock_run_git_command.side_effect = [
            "abcd1234|테스트 작성자|author@example.com|테스트 커밋 메시지|2023-05-20T10:00:00|parent1 parent2",  # show 명령의 출력
            "M\tfile1.txt\nA\tfile2.txt\nD\tfile3.txt"  # show --name-status 명령의 출력
        ]

        # 커밋 정보 조회
        commit_info = self.service.get_commit("abcd1234")

        # 결과 검증
        self.assertIsNotNone(commit_info)
        self.assertEqual(commit_info["hash"], "abcd1234")
        self.assertEqual(commit_info["author"], "테스트 작성자")
        self.assertEqual(commit_info["email"], "author@example.com")
        self.assertEqual(commit_info["message"], "테스트 커밋 메시지")
        self.assertEqual(commit_info["date"], "2023-05-20T10:00:00")
        self.assertEqual(commit_info["parents"], ["parent1", "parent2"])
        
        # 변경 파일 검증
        self.assertEqual(len(commit_info["files"]), 3)
        self.assertEqual(commit_info["files"][0]["path"], "file1.txt")
        self.assertEqual(commit_info["files"][0]["status"], "M")

    @patch.object(GitCommitService, '_run_git_command')
    def test_get_commit_from_cache(self, mock_run_git_command):
        """캐시에서 커밋 정보 조회 테스트"""
        # 캐시 히트 시뮬레이션
        cached_commit = {
            "hash": "abcd1234",
            "author": "캐시된 작성자",
            "email": "cached@example.com",
            "message": "캐시된 커밋 메시지",
            "date": "2023-05-20T10:00:00",
            "parents": ["parent1"]
        }
        self.mock_cache_manager.get.return_value = (True, cached_commit)
        
        # 커밋 정보 조회
        commit_info = self.service.get_commit("abcd1234")

        # 결과 검증
        self.assertEqual(commit_info, cached_commit)
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()

    @patch.object(GitCommitService, '_run_git_command')
    def test_get_commit_history(self, mock_run_git_command):
        """커밋 히스토리 조회 테스트"""
        # 캐시 미스 시뮬레이션
        self.mock_cache_manager.get.return_value = (False, None)
        
        # Git log 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = (
            "abcd1234|테스트 작성자1|author1@example.com|첫번째 커밋 메시지|2023-05-20T10:00:00|parent1\n"
            "efgh5678|테스트 작성자2|author2@example.com|두번째 커밋 메시지|2023-05-21T11:00:00|abcd1234"
        )

        # 커밋 히스토리 조회
        commits = self.service.get_commit_history(limit=2)

        # 결과 검증
        self.assertEqual(len(commits), 2)
        self.assertEqual(commits[0]["hash"], "abcd1234")
        self.assertEqual(commits[0]["message"], "첫번째 커밋 메시지")
        self.assertEqual(commits[1]["hash"], "efgh5678")
        self.assertEqual(commits[1]["message"], "두번째 커밋 메시지")

    @patch.object(GitCommitService, '_run_git_command')
    def test_get_commit_history_with_path(self, mock_run_git_command):
        """특정 경로에 대한 커밋 히스토리 조회 테스트"""
        # 캐시 미스 시뮬레이션
        self.mock_cache_manager.get.return_value = (False, None)
        
        # Git log 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = "abcd1234|테스트 작성자|author@example.com|파일 변경 커밋|2023-05-20T10:00:00|parent1"

        # 특정 파일 경로에 대한 커밋 히스토리 조회
        commits = self.service.get_commit_history(path="file1.txt")

        # 결과 검증
        self.assertEqual(len(commits), 1)
        self.assertEqual(commits[0]["hash"], "abcd1234")
        
        # Git 명령어 호출 검증 (경로가 포함되었는지)
        mock_run_git_command.assert_called_once()
        args = mock_run_git_command.call_args[0][0]
        self.assertIn("file1.txt", args)


if __name__ == '__main__':
    unittest.main() 