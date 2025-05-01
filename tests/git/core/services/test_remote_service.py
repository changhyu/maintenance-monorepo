"""
Git 원격 저장소 서비스 테스트 모듈

이 모듈은 GitRemoteService 클래스에 대한 단위 테스트를 제공합니다.
"""

import unittest
from unittest.mock import MagicMock, patch

from gitmanager.git.core.services.remote_service import GitRemoteService
from gitmanager.git.core.types import GitRemote
from gitmanager.git.core.exceptions import GitCommandException, GitValidationException


class TestGitRemoteService(unittest.TestCase):
    """GitRemoteService 클래스에 대한 테스트 케이스"""
    
    def setUp(self):
        """테스트 설정"""
        # 캐시 관리자 모의 객체 생성
        self.mock_cache_manager = MagicMock()
        self.mock_cache_manager.get.return_value = (False, None)  # 기본적으로 캐시 미스
        
        # 서비스 객체 생성
        self.service = GitRemoteService(
            repository_path="/test/repo",
            options={"cache": {"enabled": True}},
            cache_manager=self.mock_cache_manager
        )
        
        # _run_git_command 메서드를 패치하여 실제 Git 명령어를 실행하지 않도록 함
        self.run_git_command_patcher = patch.object(GitRemoteService, '_run_git_command')
        self.mock_run_git_command = self.run_git_command_patcher.start()
        
        # 로거 모의 객체 설정
        self.service.logger = MagicMock()
        
    def tearDown(self):
        """정리"""
        self.run_git_command_patcher.stop()
    
    @patch.object(GitRemoteService, '_get_cache_key')
    @patch.object(GitRemoteService, '_set_cache')
    def test_get_remotes(self, mock_set_cache, mock_get_cache_key):
        """원격 저장소 목록 조회 테스트"""
        # 캐시 키 모의 설정
        mock_get_cache_key.return_value = "repo:test:remotes"
        
        # Git 명령어 실행 결과 모의 설정 - 원격 저장소 2개
        self.mock_run_git_command.return_value = (
            "origin\thttps://github.com/user/repo.git (fetch)\n"
            "origin\thttps://github.com/user/repo.git (push)\n"
            "upstream\thttps://github.com/original/repo.git (fetch)\n"
            "upstream\thttps://github.com/original/repo.git (push)"
        )
        
        # 원격 저장소 목록 조회
        result = self.service.get_remotes(use_cache=True)
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertEqual(len(result["remotes"]), 2)
        
        # 첫 번째 원격 저장소 검증
        self.assertEqual(result["remotes"][0].name, "origin")
        self.assertEqual(result["remotes"][0].fetch_url, "https://github.com/user/repo.git")
        self.assertEqual(result["remotes"][0].push_url, "https://github.com/user/repo.git")
        
        # 두 번째 원격 저장소 검증
        self.assertEqual(result["remotes"][1].name, "upstream")
        self.assertEqual(result["remotes"][1].fetch_url, "https://github.com/original/repo.git")
        self.assertEqual(result["remotes"][1].push_url, "https://github.com/original/repo.git")
        
        # 캐시 저장 호출 검증
        mock_set_cache.assert_called_once_with("repo:test:remotes", result, ttl=300)
    
    @patch.object(GitRemoteService, '_get_cache')
    def test_get_remotes_from_cache(self, mock_get_cache):
        """캐시에서 원격 저장소 목록 조회 테스트"""
        # 캐시 히트 시뮬레이션
        cached_remotes = {
            "success": True,
            "remotes": [
                GitRemote(
                    name="cached_origin",
                    fetch_url="https://github.com/cached/repo.git",
                    push_url="https://github.com/cached/repo.git"
                )
            ]
        }
        mock_get_cache.return_value = (True, cached_remotes)  # 캐시 히트
        
        # 원격 저장소 목록 조회
        result = self.service.get_remotes(use_cache=True)
        
        # 결과 검증
        self.assertEqual(result, cached_remotes)
        self.assertEqual(len(result["remotes"]), 1)
        self.assertEqual(result["remotes"][0].name, "cached_origin")
        
        # Git 명령어가 실행되지 않았는지 확인
        self.mock_run_git_command.assert_not_called()
    
    def test_get_remotes_error_handling(self):
        """원격 저장소 목록 조회 중 오류 처리 테스트"""
        # Git 명령어 실행 중 예외 발생 시뮬레이션
        self.mock_run_git_command.side_effect = GitCommandException("테스트용 Git 오류")
        
        # 원격 저장소 목록 조회
        result = self.service.get_remotes()
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertIn("테스트용 Git 오류", result["error"])
        
        # 로그 기록 확인
        self.service.logger.error.assert_called_once()
    
    @patch.object(GitRemoteService, '_invalidate_remote_cache')
    def test_add_remote(self, mock_invalidate_cache):
        """원격 저장소 추가 테스트"""
        # Git 명령어 실행 결과 모의 설정
        self.mock_run_git_command.return_value = ""  # 성공 시 출력 없음
        
        # 원격 저장소 추가
        result = self.service.add_remote(
            name="test_remote",
            url="https://github.com/test/repo.git"
        )
        
        # 결과 검증
        self.assertTrue(result["success"])
        
        # Git 명령어 실행 확인
        self.mock_run_git_command.assert_called_once_with(
            ["remote", "add", "test_remote", "https://github.com/test/repo.git"]
        )
        
        # 캐시 무효화 확인
        mock_invalidate_cache.assert_called_once()
    
    def test_add_remote_validation_failed(self):
        """원격 저장소 추가 시 유효성 검사 실패 테스트"""
        # 유효하지 않은 이름으로 원격 저장소 추가
        result = self.service.add_remote(
            name="invalid remote",  # 공백이 포함된 이름
            url="https://github.com/test/repo.git"
        )
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertIn("유효하지 않은 원격 저장소 이름", result["error"])
        
        # Git 명령어가 실행되지 않았는지 확인
        self.mock_run_git_command.assert_not_called()
    
    @patch.object(GitRemoteService, '_invalidate_remote_cache')
    def test_remove_remote(self, mock_invalidate_cache):
        """원격 저장소 제거 테스트"""
        # Git 명령어 실행 결과 모의 설정
        self.mock_run_git_command.return_value = ""  # 성공 시 출력 없음
        
        # 원격 저장소 제거
        result = self.service.remove_remote(name="test_remote")
        
        # 결과 검증
        self.assertTrue(result["success"])
        
        # Git 명령어 실행 확인
        self.mock_run_git_command.assert_called_once_with(
            ["remote", "remove", "test_remote"]
        )
        
        # 캐시 무효화 확인
        mock_invalidate_cache.assert_called_once()
    
    def test_remove_remote_error_handling(self):
        """원격 저장소 제거 중 오류 처리 테스트"""
        # Git 명령어 실행 중 예외 발생 시뮬레이션
        self.mock_run_git_command.side_effect = GitCommandException("원격 저장소를 찾을 수 없습니다")
        
        # 원격 저장소 제거
        result = self.service.remove_remote(name="nonexistent_remote")
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertIn("원격 저장소를 찾을 수 없습니다", result["error"])
        
        # 로그 기록 확인
        self.service.logger.error.assert_called_once()
    
    @patch.object(GitRemoteService, 'get_remotes')
    @patch.object(GitRemoteService, '_invalidate_remote_cache')
    def test_change_remote_url(self, mock_invalidate_cache, mock_get_remotes):
        """원격 저장소 URL 변경 테스트"""
        # 원격 저장소 목록 모의 설정
        mock_get_remotes.return_value = {
            "success": True,
            "remotes": [
                GitRemote(
                    name="origin",
                    fetch_url="https://github.com/user/repo.git",
                    push_url="https://github.com/user/repo.git"
                )
            ]
        }
        
        # Git 명령어 실행 결과 모의 설정
        self.mock_run_git_command.return_value = ""  # 성공 시 출력 없음
        
        # 원격 저장소 URL 변경
        result = self.service.change_remote_url(
            name="origin",
            new_url="https://github.com/user/new-repo.git"
        )
        
        # 결과 검증
        self.assertTrue(result["success"])
        
        # Git 명령어 실행 확인
        self.mock_run_git_command.assert_called_once_with(
            ["remote", "set-url", "origin", "https://github.com/user/new-repo.git"]
        )
        
        # 캐시 무효화 확인
        mock_invalidate_cache.assert_called_once()
    
    @patch.object(GitRemoteService, 'get_remotes')
    def test_change_remote_url_nonexistent_remote(self, mock_get_remotes):
        """존재하지 않는 원격 저장소 URL 변경 테스트"""
        # 원격 저장소 목록 모의 설정 (요청한 원격 저장소가 없음)
        mock_get_remotes.return_value = {
            "success": True,
            "remotes": [
                GitRemote(
                    name="upstream",
                    fetch_url="https://github.com/original/repo.git",
                    push_url="https://github.com/original/repo.git"
                )
            ]
        }
        
        # 존재하지 않는 원격 저장소 URL 변경
        result = self.service.change_remote_url(
            name="origin",  # 존재하지 않는 원격 저장소
            new_url="https://github.com/user/new-repo.git"
        )
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertIn("존재하지 않는 원격 저장소", result["error"])
        
        # Git 명령어가 실행되지 않았는지 확인
        self.mock_run_git_command.assert_not_called()
    
    @patch.object(GitRemoteService, '_invalidate_remote_cache')
    def test_rename_remote(self, mock_invalidate_cache):
        """원격 저장소 이름 변경 테스트"""
        # Git 명령어 실행 결과 모의 설정
        self.mock_run_git_command.return_value = ""  # 성공 시 출력 없음
        
        # 원격 저장소 이름 변경
        result = self.service.rename_remote(
            old_name="origin",
            new_name="primary"
        )
        
        # 결과 검증
        self.assertTrue(result["success"])
        
        # Git 명령어 실행 확인
        self.mock_run_git_command.assert_called_once_with(
            ["remote", "rename", "origin", "primary"]
        )
        
        # 캐시 무효화 확인
        mock_invalidate_cache.assert_called_once()
    
    def test_rename_remote_validation_failed(self):
        """원격 저장소 이름 변경 시 유효성 검사 실패 테스트"""
        # 유효하지 않은 이름으로 원격 저장소 이름 변경
        result = self.service.rename_remote(
            old_name="origin",
            new_name="invalid name"  # 공백이 포함된 이름
        )
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertIn("유효하지 않은 원격 저장소 이름", result["error"])
        
        # Git 명령어가 실행되지 않았는지 확인
        self.mock_run_git_command.assert_not_called()


if __name__ == '__main__':
    unittest.main() 