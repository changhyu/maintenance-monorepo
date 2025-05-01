"""
GitServiceBase 클래스에 대한 단위 테스트
"""
import os
import unittest
from unittest.mock import patch, MagicMock

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.exceptions import GitNotInstalledError, GitCommandError


class TestGitServiceBase(unittest.TestCase):
    """GitServiceBase 클래스에 대한 테스트 케이스"""

    @patch('gitmanager.git.core.services.base_service.is_git_installed')
    @patch('gitmanager.git.core.services.base_service.CacheManager')
    def setUp(self, mock_cache_manager, mock_is_git_installed):
        """테스트 셋업"""
        mock_is_git_installed.return_value = True
        self.mock_cache_manager = mock_cache_manager.return_value
        self.test_repo_path = '/tmp/test_repo'
        self.service = GitServiceBase(repo_path=self.test_repo_path)

    def test_init(self):
        """초기화 테스트"""
        self.assertEqual(self.service.repo_path, self.test_repo_path)
        self.assertFalse(self.service.bare)
        self.assertEqual(self.service.cache_settings['default_ttl'], 300)

    @patch('gitmanager.git.core.services.base_service.is_git_installed')
    def test_git_not_installed(self, mock_is_git_installed):
        """Git이 설치되지 않은 경우 예외 발생 테스트"""
        mock_is_git_installed.return_value = False
        with self.assertRaises(GitNotInstalledError):
            GitServiceBase(repo_path=self.test_repo_path)

    def test_get_cache_key(self):
        """캐시 키 생성 테스트"""
        key = self.service._get_cache_key('test_command', ['arg1', 'arg2'])
        self.assertIn('test_command', key)
        self.assertIn('arg1', key)
        self.assertIn('arg2', key)
        self.assertIn(self.test_repo_path, key)

    @patch('gitmanager.git.core.services.base_service.run_git_command')
    def test_run_git_cmd(self, mock_run_git_command):
        """Git 명령 실행 테스트"""
        mock_run_git_command.return_value = "command_output"
        result = self.service.run_git_cmd("test_cmd", ["arg1", "arg2"])
        self.assertEqual(result, "command_output")
        mock_run_git_command.assert_called_once_with(
            "test_cmd", ["arg1", "arg2"], cwd=self.test_repo_path, 
            raise_exception=True, strip_output=True
        )

    @patch('gitmanager.git.core.services.base_service.run_git_command')
    def test_run_git_cmd_error(self, mock_run_git_command):
        """Git 명령 오류 처리 테스트"""
        mock_run_git_command.side_effect = GitCommandError("Error message")
        with self.assertRaises(GitCommandError):
            self.service.run_git_cmd("test_cmd", ["arg1", "arg2"])

    def test_get_from_cache(self):
        """캐시에서 값 가져오기 테스트"""
        self.mock_cache_manager.get.return_value = "cached_value"
        result = self.service.get_from_cache("test_key")
        self.assertEqual(result, "cached_value")
        self.mock_cache_manager.get.assert_called_once_with("test_key")

    def test_set_to_cache(self):
        """캐시에 값 설정 테스트"""
        self.service.set_to_cache("test_key", "test_value", ttl=500)
        self.mock_cache_manager.set.assert_called_once_with("test_key", "test_value", ttl=500)

    def test_clear_cache(self):
        """캐시 초기화 테스트"""
        self.service.clear_cache()
        self.mock_cache_manager.clear.assert_called_once()

    def test_get_cache_stats(self):
        """캐시 통계 가져오기 테스트"""
        self.mock_cache_manager.get_stats.return_value = {"hits": 10, "misses": 5}
        stats = self.service.get_cache_stats()
        self.assertEqual(stats["hits"], 10)
        self.assertEqual(stats["misses"], 5)


if __name__ == '__main__':
    unittest.main() 