"""
GitBranchService 클래스에 대한 단위 테스트
"""
import unittest
from unittest.mock import patch, MagicMock

from gitmanager.git.core.services.branch_service import GitBranchService
from gitmanager.git.core.exceptions import (
    GitBranchException,
    GitCommandException,
    GitConflictException,
    GitMergeConflictException,
)
from gitmanager.git.core.types import GitBranch, MergeConflictResult


class TestGitBranchService(unittest.TestCase):
    """GitBranchService 클래스에 대한 테스트 케이스"""

    @patch('gitmanager.git.core.services.base_service.is_git_installed')
    @patch('gitmanager.git.core.services.base_service.CacheManager')
    def setUp(self, mock_cache_manager, mock_is_git_installed):
        """테스트 셋업"""
        mock_is_git_installed.return_value = True
        self.mock_cache_manager = mock_cache_manager.return_value
        self.test_repo_path = '/tmp/test_repo'
        self.service = GitBranchService(repo_path=self.test_repo_path)

    def test_init(self):
        """초기화 테스트"""
        self.assertEqual(self.service.repo_path, self.test_repo_path)
        self.assertFalse(self.service.bare)

    @patch.object(GitBranchService, '_run_git_command')
    def test_get_branches(self, mock_run_git_command):
        """브랜치 목록 조회 테스트"""
        # 캐시 미스 시뮬레이션
        self.mock_cache_manager.get.return_value = (False, None)
        
        # Git branch 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = (
            "* main                 abcd123 [origin/main] 메인 브랜치 커밋\n"
            "  feature/test         efgh456 기능 개발 커밋\n"
            "  remotes/origin/main  abcd123 메인 브랜치 커밋\n"
            "  remotes/origin/dev   ijkl789 개발 브랜치 커밋"
        )

        # 브랜치 목록 조회
        branches = self.service.get_branches(include_remote=True)

        # 결과 검증
        self.assertEqual(len(branches), 4)
        
        # 로컬 메인 브랜치 검증
        main_branch = next(b for b in branches if b.name == 'main')
        self.assertTrue(main_branch.is_current)
        self.assertFalse(main_branch.is_remote)
        self.assertEqual(main_branch.tracking, 'origin/main')
        
        # 로컬 피처 브랜치 검증
        feature_branch = next(b for b in branches if b.name == 'feature/test')
        self.assertFalse(feature_branch.is_current)
        self.assertFalse(feature_branch.is_remote)
        
        # 원격 브랜치 검증
        origin_main = next(b for b in branches if b.name == 'origin/main')
        self.assertTrue(origin_main.is_remote)
        
        # 캐시 저장 검증
        self.mock_cache_manager.set.assert_called_once()

    @patch.object(GitBranchService, '_run_git_command')
    def test_get_branches_local_only(self, mock_run_git_command):
        """로컬 브랜치만 조회 테스트"""
        # 캐시 미스 시뮬레이션
        self.mock_cache_manager.get.return_value = (False, None)
        
        # Git branch 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = (
            "* main                 abcd123 메인 브랜치 커밋\n"
            "  feature/test         efgh456 기능 개발 커밋"
        )

        # 로컬 브랜치만 조회
        branches = self.service.get_branches(include_remote=False)

        # 결과 검증
        self.assertEqual(len(branches), 2)
        
        # 명령어 호출 검증 (--all 플래그가 없는지)
        mock_run_git_command.assert_called_once()
        args = mock_run_git_command.call_args[0][0]
        self.assertNotIn("--all", args)

    @patch.object(GitBranchService, '_run_git_command')
    def test_get_branches_from_cache(self, mock_run_git_command):
        """캐시에서 브랜치 목록 조회 테스트"""
        # 캐시된 브랜치 목록
        cached_branches = [
            GitBranch(name="main", is_current=True, is_remote=False, tracking="origin/main", last_commit="abcd123"),
            GitBranch(name="feature/test", is_current=False, is_remote=False, tracking=None, last_commit="efgh456")
        ]
        
        # 캐시 히트 시뮬레이션
        self.mock_cache_manager.get.return_value = (True, cached_branches)
        
        # 브랜치 목록 조회
        branches = self.service.get_branches()

        # 결과 검증
        self.assertEqual(branches, cached_branches)
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()

    @patch.object(GitBranchService, '_run_git_command')
    def test_get_current_branch(self, mock_run_git_command):
        """현재 브랜치 조회 테스트"""
        # Git symbolic-ref 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = "main"

        # 현재 브랜치 조회
        current_branch = self.service.get_current_branch()

        # 결과 검증
        self.assertEqual(current_branch, "main")
        
        # 명령어 호출 검증
        mock_run_git_command.assert_called_once_with(
            ["symbolic-ref", "--short", "HEAD"], check_errors=False
        )

    @patch.object(GitBranchService, '_run_git_command')
    def test_get_current_branch_detached_head(self, mock_run_git_command):
        """디태치드 HEAD 상태에서 현재 브랜치 조회 테스트"""
        # Git symbolic-ref 명령어가 실패하고 rev-parse 명령어가 성공하는 상황 설정
        mock_run_git_command.side_effect = [
            "fatal: ref HEAD is not a symbolic ref",  # symbolic-ref 명령의 출력
            "abcd123"  # rev-parse 명령의 출력
        ]

        # 현재 브랜치 조회
        current_branch = self.service.get_current_branch()

        # 결과 검증
        self.assertEqual(current_branch, "detached-abcd123")
        
        # 두 명령어가 순서대로 호출되었는지 확인
        self.assertEqual(mock_run_git_command.call_count, 2)
        self.assertEqual(mock_run_git_command.call_args_list[1][0][0], ["rev-parse", "--short", "HEAD"])

    @patch.object(GitBranchService, '_run_git_command')
    @patch.object(GitBranchService, '_invalidate_branch_cache')
    def test_create_branch(self, mock_invalidate_cache, mock_run_git_command):
        """브랜치 생성 테스트"""
        # 기존 브랜치 목록 설정
        mock_run_git_command.side_effect = [
            (
                "* main                 abcd123 메인 브랜치 커밋\n"
                "  feature/test         efgh456 기능 개발 커밋"
            ),  # get_branches()에 대한 응답
            ""  # branch 명령에 대한 응답
        ]
        
        # 브랜치 생성
        result = self.service.create_branch("feature/new")

        # 결과 검증
        self.assertTrue(result)
        
        # 명령어 호출 검증
        mock_run_git_command.assert_any_call(["branch", "feature/new"])
        
        # 캐시 무효화 검증
        mock_invalidate_cache.assert_called_once()

    @patch.object(GitBranchService, '_run_git_command')
    def test_create_branch_with_start_point(self, mock_run_git_command):
        """시작 지점을 지정한 브랜치 생성 테스트"""
        # 기존 브랜치 목록 설정
        mock_run_git_command.side_effect = [
            "* main                 abcd123 메인 브랜치 커밋",  # get_branches()에 대한 응답
            ""  # branch 명령에 대한 응답
        ]
        
        # 시작 지점을 지정하여 브랜치 생성
        result = self.service.create_branch("feature/new", start_point="abcd123")

        # 결과 검증
        self.assertTrue(result)
        
        # 명령어 호출 검증
        mock_run_git_command.assert_any_call(["branch", "feature/new", "abcd123"])

    @patch.object(GitBranchService, '_run_git_command')
    def test_create_branch_invalid_name(self, mock_run_git_command):
        """유효하지 않은 브랜치 이름으로 생성 시도 테스트"""
        # 유효하지 않은 브랜치 이름으로 생성 시도
        result = self.service.create_branch("feature/invalid?name")

        # 결과 검증
        self.assertFalse(result)
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()

    @patch.object(GitBranchService, '_run_git_command')
    def test_create_branch_already_exists(self, mock_run_git_command):
        """이미 존재하는 브랜치 이름으로 생성 시도 테스트"""
        # 기존 브랜치 목록에 이미 존재하는 브랜치 포함
        mock_run_git_command.return_value = (
            "* main                 abcd123 메인 브랜치 커밋\n"
            "  feature/existing     efgh456 기능 개발 커밋"
        )
        
        # 이미 존재하는 브랜치 이름으로 생성 시도
        result = self.service.create_branch("feature/existing")

        # 결과 검증
        self.assertFalse(result)
        
        # 브랜치 목록 조회만 호출되고 생성 명령은 실행되지 않았는지 확인
        mock_run_git_command.assert_called_once()

    @patch.object(GitBranchService, '_run_git_command')
    @patch.object(GitBranchService, '_invalidate_branch_cache')
    def test_checkout_branch(self, mock_invalidate_cache, mock_run_git_command):
        """브랜치 체크아웃 테스트"""
        # Git checkout 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = "Switched to branch 'feature/test'"

        # 브랜치 체크아웃
        result = self.service.checkout_branch("feature/test")

        # 결과 검증
        self.assertTrue(result)
        
        # 명령어 호출 검증
        mock_run_git_command.assert_called_once_with(["checkout", "feature/test"])
        
        # 캐시 무효화 검증
        mock_invalidate_cache.assert_called_once()

    @patch.object(GitBranchService, '_run_git_command')
    def test_checkout_branch_and_create(self, mock_run_git_command):
        """없는 브랜치를 생성하면서 체크아웃 테스트"""
        # Git checkout -b 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = "Switched to a new branch 'feature/new'"

        # 브랜치 생성 및 체크아웃
        result = self.service.checkout_branch("feature/new", create=True)

        # 결과 검증
        self.assertTrue(result)
        
        # 명령어 호출 검증
        mock_run_git_command.assert_called_once_with(["checkout", "-b", "feature/new"])

    @patch.object(GitBranchService, '_run_git_command')
    def test_checkout_branch_fail(self, mock_run_git_command):
        """브랜치 체크아웃 실패 테스트"""
        # Git checkout 명령어 실패 시뮬레이션
        mock_run_git_command.side_effect = GitCommandException("error: pathspec 'feature/nonexistent' did not match any file(s) known to git")

        # 존재하지 않는 브랜치 체크아웃 시도
        result = self.service.checkout_branch("feature/nonexistent")

        # 결과 검증
        self.assertFalse(result)

    @patch.object(GitBranchService, '_run_git_command')
    @patch.object(GitBranchService, '_invalidate_branch_cache')
    def test_delete_branch(self, mock_invalidate_cache, mock_run_git_command):
        """브랜치 삭제 테스트"""
        # 현재 브랜치 및 삭제 명령어에 대한 응답 모의 설정
        mock_run_git_command.side_effect = [
            "main",  # get_current_branch()에 대한 응답
            "Deleted branch feature/test (was efgh456)."  # branch -d 명령에 대한 응답
        ]

        # 브랜치 삭제
        result = self.service.delete_branch("feature/test")

        # 결과 검증
        self.assertTrue(result)
        
        # 명령어 호출 검증
        mock_run_git_command.assert_any_call(["branch", "-d", "feature/test"])
        
        # 캐시 무효화 검증
        mock_invalidate_cache.assert_called_once()

    @patch.object(GitBranchService, '_run_git_command')
    def test_delete_current_branch(self, mock_run_git_command):
        """현재 체크아웃된 브랜치 삭제 시도 테스트"""
        # 현재 브랜치 설정
        mock_run_git_command.return_value = "feature/test"  # get_current_branch()에 대한 응답

        # 현재 체크아웃된 브랜치 삭제 시도
        result = self.service.delete_branch("feature/test")

        # 결과 검증
        self.assertFalse(result)
        
        # 현재 브랜치 조회만 호출되고 삭제 명령은 실행되지 않았는지 확인
        self.assertEqual(mock_run_git_command.call_count, 1)

    @patch.object(GitBranchService, '_run_git_command')
    def test_delete_branch_force(self, mock_run_git_command):
        """강제 브랜치 삭제 테스트"""
        # 현재 브랜치 및 삭제 명령어에 대한 응답 모의 설정
        mock_run_git_command.side_effect = [
            "main",  # get_current_branch()에 대한 응답
            "Deleted branch feature/test (was efgh456)."  # branch -D 명령에 대한 응답
        ]

        # 강제 브랜치 삭제
        result = self.service.delete_branch("feature/test", force=True)

        # 결과 검증
        self.assertTrue(result)
        
        # 명령어 호출 검증
        mock_run_git_command.assert_any_call(["branch", "-D", "feature/test"])

    @patch.object(GitBranchService, '_run_git_command')
    def test_delete_branch_not_merged(self, mock_run_git_command):
        """병합되지 않은 브랜치 삭제 시도 테스트"""
        # 현재 브랜치 설정 및 삭제 명령어 실패 시뮬레이션
        mock_run_git_command.side_effect = [
            "main",  # get_current_branch()에 대한 응답
            GitCommandException("error: The branch 'feature/test' is not fully merged. If you are sure you want to delete it, run 'git branch -D feature/test'.")
        ]

        # 병합되지 않은 브랜치 삭제 시도
        result = self.service.delete_branch("feature/test")

        # 결과 검증
        self.assertFalse(result)

    @patch.object(GitBranchService, '_run_git_command')
    @patch.object(GitBranchService, '_invalidate_branch_cache')
    def test_merge_branch(self, mock_invalidate_cache, mock_run_git_command):
        """브랜치 병합 테스트"""
        # Git merge 명령어에 대한 응답 모의 설정
        mock_run_git_command.return_value = "Fast-forward\n file1.txt | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)"

        # 브랜치 병합
        result = self.service.merge_branch("feature/test", "main")

        # 결과 검증
        self.assertTrue(result["success"])
        self.assertFalse(result["has_conflicts"])
        
        # 명령어 호출 검증
        mock_run_git_command.assert_called_once_with(["merge", "feature/test"])
        
        # 캐시 무효화 검증
        mock_invalidate_cache.assert_called_once()

    @patch.object(GitBranchService, '_run_git_command')
    def test_merge_branch_conflict(self, mock_run_git_command):
        """충돌이 발생하는 브랜치 병합 테스트"""
        # Git merge 명령어 실패 시뮬레이션 (충돌 발생)
        mock_run_git_command.side_effect = GitCommandException(
            "Automatic merge failed; fix conflicts and then commit the result.",
            stderr="CONFLICT (content): Merge conflict in file1.txt\nCONFLICT (modify/delete): file2.txt deleted in feature/test and modified in HEAD"
        )

        # 충돌이 발생하는 브랜치 병합 시도
        result = self.service.merge_branch("feature/test", "main")

        # 결과 검증
        self.assertFalse(result["success"])
        self.assertTrue(result["has_conflicts"])
        self.assertEqual(len(result["conflicts"]), 2)
        self.assertEqual(result["conflicts"][0]["file"], "file1.txt")
        self.assertEqual(result["conflicts"][0]["type"], "content")
        self.assertEqual(result["conflicts"][1]["file"], "file2.txt")
        self.assertEqual(result["conflicts"][1]["type"], "modify/delete")


if __name__ == '__main__':
    unittest.main() 