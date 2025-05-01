"""
Git 상태 서비스 테스트 모듈

이 모듈은 GitStatusService 클래스에 대한 단위 테스트를 제공합니다.
"""

import unittest
from unittest.mock import MagicMock, patch

from gitmanager.git.core.services.status_service import GitStatusService
from gitmanager.git.core.types import GitStatus
from gitmanager.git.core.exceptions import GitCommandException


class TestGitStatusService(unittest.TestCase):
    """GitStatusService 클래스에 대한 테스트 케이스"""
    
    def setUp(self):
        """테스트 설정"""
        # 캐시 관리자 모의 객체 생성
        self.mock_cache_manager = MagicMock()
        self.mock_cache_manager.get.return_value = (False, None)  # 기본적으로 캐시 미스
        
        # 서비스 객체 생성
        self.service = GitStatusService(
            repository_path="/test/repo",
            options={"cache": {"enabled": True}},
            cache_manager=self.mock_cache_manager
        )
        
        # _run_git_command 메서드를 패치하여 실제 Git 명령어를 실행하지 않도록 함
        self.run_git_command_patcher = patch.object(GitStatusService, '_run_git_command')
        self.mock_run_git_command = self.run_git_command_patcher.start()
        
        # 로거 모의 객체 설정
        self.service.logger = MagicMock()
        
    def tearDown(self):
        """정리"""
        self.run_git_command_patcher.stop()
    
    @patch.object(GitStatusService, '_get_cache_key')
    @patch.object(GitStatusService, '_set_cache')
    def test_get_status_clean_repo(self, mock_set_cache, mock_get_cache_key):
        """깨끗한 저장소의 상태 조회 테스트"""
        # 캐시 키 모의 설정
        mock_get_cache_key.return_value = "repo:test:status"
        
        # Git 명령어 실행 결과 모의 설정 - 깨끗한 저장소
        self.mock_run_git_command.side_effect = [
            "main",  # branch 명령어 결과
            "",      # status --porcelain 명령어 결과 (변경 없음)
            "abcd1234 커밋 메시지",  # log -1 명령어 결과
        ]
        
        # 저장소 상태 조회
        result = self.service.get_status(use_cache=True)
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertEqual(result["status"].branch, "main")
        self.assertEqual(result["status"].last_commit_hash, "abcd1234")
        self.assertEqual(result["status"].last_commit_message, "커밋 메시지")
        self.assertEqual(len(result["status"].modified_files), 0)
        self.assertEqual(len(result["status"].staged_files), 0)
        self.assertEqual(len(result["status"].untracked_files), 0)
        self.assertEqual(len(result["status"].conflict_files), 0)
        self.assertTrue(result["status"].is_clean)
        
        # 캐시 저장 호출 검증
        mock_set_cache.assert_called_once_with("repo:test:status", result, ttl=10)
    
    @patch.object(GitStatusService, '_get_cache_key')
    @patch.object(GitStatusService, '_set_cache')
    def test_get_status_with_changes(self, mock_set_cache, mock_get_cache_key):
        """변경사항이 있는 저장소의 상태 조회 테스트"""
        # 캐시 키 모의 설정
        mock_get_cache_key.return_value = "repo:test:status"
        
        # Git 명령어 실행 결과 모의 설정 - 변경사항이 있는 저장소
        self.mock_run_git_command.side_effect = [
            "feature",  # branch 명령어 결과
            " M file1.txt\n?? file2.txt\nA  file3.txt\nUU file4.txt",  # status --porcelain 명령어 결과
            "efgh5678 기능 추가",  # log -1 명령어 결과
        ]
        
        # 저장소 상태 조회
        result = self.service.get_status()
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertEqual(result["status"].branch, "feature")
        self.assertEqual(result["status"].last_commit_hash, "efgh5678")
        self.assertEqual(result["status"].last_commit_message, "기능 추가")
        
        # 변경 파일 검증
        self.assertEqual(len(result["status"].modified_files), 1)
        self.assertEqual(result["status"].modified_files[0], "file1.txt")
        
        # 스테이징된 파일 검증
        self.assertEqual(len(result["status"].staged_files), 1)
        self.assertEqual(result["status"].staged_files[0], "file3.txt")
        
        # 추적되지 않은 파일 검증
        self.assertEqual(len(result["status"].untracked_files), 1)
        self.assertEqual(result["status"].untracked_files[0], "file2.txt")
        
        # 충돌 파일 검증
        self.assertEqual(len(result["status"].conflict_files), 1)
        self.assertEqual(result["status"].conflict_files[0], "file4.txt")
        
        # 저장소가 깨끗하지 않음
        self.assertFalse(result["status"].is_clean)
    
    @patch.object(GitStatusService, '_get_cache')
    def test_get_status_from_cache(self, mock_get_cache):
        """캐시에서 저장소 상태 조회 테스트"""
        # 캐시 히트 시뮬레이션
        cached_status = {
            "success": True,
            "status": GitStatus(
                branch="cached_branch",
                is_clean=True,
                modified_files=[],
                staged_files=[],
                untracked_files=[],
                conflict_files=[],
                last_commit_hash="cached1234",
                last_commit_message="캐시된 커밋 메시지"
            )
        }
        mock_get_cache.return_value = (True, cached_status)  # 캐시 히트
        
        # 저장소 상태 조회
        result = self.service.get_status(use_cache=True)
        
        # 결과 검증
        self.assertEqual(result, cached_status)
        self.assertEqual(result["status"].branch, "cached_branch")
        self.assertEqual(result["status"].last_commit_hash, "cached1234")
        
        # Git 명령어가 실행되지 않았는지 확인
        self.mock_run_git_command.assert_not_called()
    
    def test_get_status_error_handling(self):
        """저장소 상태 조회 중 오류 처리 테스트"""
        # Git 명령어 실행 중 예외 발생 시뮬레이션
        self.mock_run_git_command.side_effect = GitCommandException("테스트용 Git 오류")
        
        # 저장소 상태 조회
        result = self.service.get_status()
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertIn("테스트용 Git 오류", result["error"])
        
        # 로그 기록 확인
        self.service.logger.error.assert_called_once()
    
    @patch.object(GitStatusService, 'get_status')
    def test_is_clean_true(self, mock_get_status):
        """저장소가 깨끗한 경우 is_clean 테스트"""
        # get_status 모의 설정 - 깨끗한 저장소
        mock_get_status.return_value = {
            "success": True,
            "status": GitStatus(
                branch="main",
                is_clean=True,
                modified_files=[],
                staged_files=[],
                untracked_files=[],
                conflict_files=[],
                last_commit_hash="abcd1234",
                last_commit_message="커밋 메시지"
            )
        }
        
        # is_clean 메서드 호출
        result = self.service.is_clean()
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertTrue(result["is_clean"])
    
    @patch.object(GitStatusService, 'get_status')
    def test_is_clean_false(self, mock_get_status):
        """저장소가 깨끗하지 않은 경우 is_clean 테스트"""
        # get_status 모의 설정 - 변경사항이 있는 저장소
        mock_get_status.return_value = {
            "success": True,
            "status": GitStatus(
                branch="feature",
                is_clean=False,
                modified_files=["file1.txt"],
                staged_files=[],
                untracked_files=["file2.txt"],
                conflict_files=[],
                last_commit_hash="efgh5678",
                last_commit_message="기능 추가"
            )
        }
        
        # is_clean 메서드 호출
        result = self.service.is_clean()
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertFalse(result["is_clean"])
    
    @patch.object(GitStatusService, 'get_status')
    def test_has_conflicts_true(self, mock_get_status):
        """충돌이, 있는 경우 has_conflicts 테스트"""
        # get_status 모의 설정 - 충돌이 있는 저장소
        mock_get_status.return_value = {
            "success": True,
            "status": GitStatus(
                branch="feature",
                is_clean=False,
                modified_files=[],
                staged_files=[],
                untracked_files=[],
                conflict_files=["file1.txt", "file2.txt"],
                last_commit_hash="abcd1234",
                last_commit_message="머지 시도"
            )
        }
        
        # has_conflicts 메서드 호출
        result = self.service.has_conflicts()
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertTrue(result["has_conflicts"])
        self.assertEqual(len(result["conflict_files"]), 2)
        self.assertIn("file1.txt", result["conflict_files"])
        self.assertIn("file2.txt", result["conflict_files"])
    
    @patch.object(GitStatusService, 'get_status')
    def test_has_conflicts_false(self, mock_get_status):
        """충돌이 없는 경우 has_conflicts 테스트"""
        # get_status 모의 설정 - 충돌이 없는 저장소
        mock_get_status.return_value = {
            "success": True,
            "status": GitStatus(
                branch="main",
                is_clean=True,
                modified_files=[],
                staged_files=[],
                untracked_files=[],
                conflict_files=[],
                last_commit_hash="abcd1234",
                last_commit_message="커밋 메시지"
            )
        }
        
        # has_conflicts 메서드 호출
        result = self.service.has_conflicts()
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertFalse(result["has_conflicts"])
        self.assertEqual(len(result["conflict_files"]), 0)


if __name__ == '__main__':
    unittest.main() 