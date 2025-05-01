"""
Git 서비스 통합 테스트 모듈

실제 Git 저장소를 사용하여 서비스 클래스들의 통합 동작을 테스트합니다.
"""
import os
import unittest
import tempfile
import shutil

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.services.branch_service import GitBranchService
from gitmanager.git.core.services.commit_service import GitCommitService
from gitmanager.git.core.exceptions import GitCommandException

from tests.git.core.services.test_utils import (
    temp_git_repo,
    create_test_file,
    make_commit,
    create_branch,
    checkout_branch,
    get_current_branch,
    create_merge_conflict,
    get_file_content
)


class TestGitServicesIntegration(unittest.TestCase):
    """Git 서비스 통합 테스트 클래스"""

    def setUp(self):
        """테스트 셋업 - 임시 저장소 생성"""
        self.temp_dir = tempfile.mkdtemp()
        
        # Git 저장소 초기화
        os.system(f"git init {self.temp_dir}")
        os.system(f"cd {self.temp_dir} && git config user.name 'Test User'")
        os.system(f"cd {self.temp_dir} && git config user.email 'test@example.com'")
        
        # 서비스 인스턴스 생성
        self.base_service = GitServiceBase(repo_path=self.temp_dir)
        self.branch_service = GitBranchService(repo_path=self.temp_dir)
        self.commit_service = GitCommitService(repo_path=self.temp_dir)

    def tearDown(self):
        """테스트 종료 - 임시 저장소 삭제"""
        shutil.rmtree(self.temp_dir)

    def test_commit_and_branch_operations(self):
        """커밋 및 브랜치 작업 통합 테스트"""
        # 파일 생성
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("테스트 파일 내용")

        # 커밋 실행
        commit_result = self.commit_service.commit(
            message="첫 번째 테스트 커밋",
            add_all=True
        )
        
        # 커밋 결과 검증
        self.assertTrue(commit_result.success)
        self.assertIsNotNone(commit_result.commit)
        self.assertEqual(commit_result.commit["message"], "첫 번째 테스트 커밋")
        
        # 브랜치 생성
        branch_created = self.branch_service.create_branch("feature/test")
        self.assertTrue(branch_created)
        
        # 브랜치 목록 조회
        branches = self.branch_service.get_branches()
        self.assertEqual(len(branches), 2)  # main과 feature/test
        
        branch_names = [b.name for b in branches]
        self.assertIn("main", branch_names)
        self.assertIn("feature/test", branch_names)
        
        # 브랜치 체크아웃
        checkout_result = self.branch_service.checkout_branch("feature/test")
        self.assertTrue(checkout_result)
        
        # 현재 브랜치 확인
        current_branch = self.branch_service.get_current_branch()
        self.assertEqual(current_branch, "feature/test")
        
        # 두 번째 파일 생성 및 커밋
        feature_file = os.path.join(self.temp_dir, "feature.txt")
        with open(feature_file, "w") as f:
            f.write("기능 브랜치 파일 내용")
        
        commit_result = self.commit_service.commit(
            message="기능 브랜치 커밋",
            add_all=True
        )
        
        # 기능 브랜치 커밋 검증
        self.assertTrue(commit_result.success)
        
        # 커밋 히스토리 조회
        commits = self.commit_service.get_commit_history()
        self.assertEqual(len(commits), 2)
        self.assertEqual(commits[0]["message"], "기능 브랜치 커밋")
        
        # main 브랜치로 돌아가기
        self.branch_service.checkout_branch("main")
        
        # main 브랜치 커밋 히스토리 확인
        main_commits = self.commit_service.get_commit_history()
        self.assertEqual(len(main_commits), 1)
        self.assertEqual(main_commits[0]["message"], "첫 번째 테스트 커밋")

    def test_merge_functionality(self):
        """브랜치 병합 기능 테스트"""
        # 초기 파일 생성 및 커밋
        initial_file = os.path.join(self.temp_dir, "initial.txt")
        with open(initial_file, "w") as f:
            f.write("초기 파일 내용")
        
        self.commit_service.commit(
            message="초기 커밋",
            add_all=True
        )
        
        # 브랜치 생성 및 체크아웃
        self.branch_service.create_branch("feature/merge-test")
        self.branch_service.checkout_branch("feature/merge-test")
        
        # 브랜치에서 파일 수정 및 커밋
        feature_file = os.path.join(self.temp_dir, "feature_merge.txt")
        with open(feature_file, "w") as f:
            f.write("병합 테스트 파일 내용")
        
        self.commit_service.commit(
            message="병합 테스트 커밋",
            add_all=True
        )
        
        # main 브랜치로 전환
        self.branch_service.checkout_branch("main")
        
        # feature 브랜치 병합
        merge_result = self.branch_service.merge_branch(
            source_branch="feature/merge-test",
            target_branch="main"
        )
        
        # 병합 결과 검증
        self.assertTrue(merge_result["success"])
        self.assertFalse(merge_result["has_conflicts"])
        
        # 병합 후 파일 존재 확인
        self.assertTrue(os.path.exists(feature_file))
        
        # 병합 후 커밋 히스토리 확인
        commits = self.commit_service.get_commit_history()
        self.assertEqual(len(commits), 3)  # 초기 커밋 + 브랜치 커밋 + 병합 커밋
        self.assertIn("Merge branch", commits[0]["message"])

    def test_merge_conflict_handling(self):
        """병합 충돌 처리 테스트"""
        with temp_git_repo() as repo_path:
            # 서비스 인스턴스 생성
            branch_service = GitBranchService(repo_path=repo_path)
            commit_service = GitCommitService(repo_path=repo_path)
            
            # 충돌 상황 생성
            original_branch, conflict_branch, conflict_files = create_merge_conflict(repo_path)
            
            # 충돌 발생하는 병합 시도
            merge_result = branch_service.merge_branch(
                source_branch=conflict_branch,
                target_branch=original_branch
            )
            
            # 병합 결과 검증
            self.assertFalse(merge_result["success"])
            self.assertTrue(merge_result["has_conflicts"])
            self.assertIn("conflict.txt", [c["file"] for c in merge_result["conflicts"]])
            
            # 충돌 파일 확인
            conflict_content = get_file_content(repo_path, "conflict.txt")
            self.assertIn("<<<<<<<", conflict_content)
            self.assertIn("=======", conflict_content)
            self.assertIn(">>>>>>>", conflict_content)
            
            # 충돌 해결
            with open(os.path.join(repo_path, "conflict.txt"), "w") as f:
                f.write("Initial content\nConflict resolved\nAnother line")
            
            # 해결된 파일 커밋
            commit_result = commit_service.commit(
                message="Resolve merge conflict",
                add_all=True
            )
            
            # 결과 검증
            self.assertTrue(commit_result.success)
            
            # 병합 완료 후 커밋 히스토리 확인
            commits = commit_service.get_commit_history()
            self.assertEqual(commits[0]["message"], "Resolve merge conflict")

    def test_commit_with_specific_author(self):
        """특정 작성자 정보를 포함한 커밋 테스트"""
        # 파일 생성
        test_file = os.path.join(self.temp_dir, "author_test.txt")
        with open(test_file, "w") as f:
            f.write("작성자 테스트 파일 내용")
        
        # 특정 작성자로 커밋
        author_name = "커스텀 작성자"
        author_email = "custom@example.com"
        
        commit_result = self.commit_service.commit(
            message="작성자 테스트 커밋",
            add_all=True,
            author=author_name,
            email=author_email
        )
        
        # 커밋 결과 검증
        self.assertTrue(commit_result.success)
        
        # 커밋 정보 조회
        commit = self.commit_service.get_commit(commit_result.commit["hash"])
        
        # 작성자 정보 검증
        self.assertEqual(commit["author"], author_name)
        self.assertEqual(commit["email"], author_email)


if __name__ == "__main__":
    unittest.main() 