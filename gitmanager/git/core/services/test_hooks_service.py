"""
GitHooksService 테스트 모듈

이 모듈은 Git 훅 관리 서비스에 대한 단위 테스트를 포함합니다.
"""

import os
import stat
import tempfile
import unittest
from unittest.mock import patch, MagicMock, mock_open

from gitmanager.git.core.services.hooks_service import GitHooksService
from gitmanager.git.core.exceptions import GitHooksException


class TestGitHooksService(unittest.TestCase):
    """GitHooksService 클래스에 대한 테스트 케이스"""

    def setUp(self):
        """각 테스트 실행 전 설정"""
        # 임시 저장소 경로 생성
        self.repo_path = tempfile.mkdtemp()
        self.hooks_dir = os.path.join(self.repo_path, ".git", "hooks")
        
        # GitHooksService의 run_git_cmd를 모킹
        self.patch_run_git = patch.object(GitHooksService, 'run_git_cmd')
        self.mock_run_git = self.patch_run_git.start()
        
        # 통합 캐시 관리자 모킹
        self.patch_cache = patch('gitmanager.git.core.cache_utils.get_unified_cache_manager')
        self.mock_get_cache_manager = self.patch_cache.start()
        self.mock_cache_instance = MagicMock()
        self.mock_get_cache_manager.return_value = self.mock_cache_instance
        
        # 디렉토리 및 파일 존재 검사 모킹
        self.patch_exists = patch('os.path.exists')
        self.mock_exists = self.patch_exists.start()
        self.mock_exists.return_value = True
        
        # 디렉토리 생성 모킹
        self.patch_makedirs = patch('os.makedirs')
        self.mock_makedirs = self.patch_makedirs.start()
        
        # 디렉토리 목록 조회 모킹
        self.patch_listdir = patch('os.listdir')
        self.mock_listdir = self.patch_listdir.start()
        
        # 파일 열기 모킹
        self.patch_open = patch('builtins.open', mock_open())
        self.mock_open = self.patch_open.start()
        
        # 파일 권한 조회 및 설정 모킹
        self.patch_stat = patch('os.stat')
        self.mock_stat = self.patch_stat.start()
        self.mock_stat_result = MagicMock()
        self.mock_stat.return_value = self.mock_stat_result
        
        self.patch_chmod = patch('os.chmod')
        self.mock_chmod = self.patch_chmod.start()
        
        # 파일 삭제 모킹
        self.patch_remove = patch('os.remove')
        self.mock_remove = self.patch_remove.start()
        
        # 파일 복사 모킹
        self.patch_copy = patch('shutil.copy2')
        self.mock_copy = self.patch_copy.start()
        
        # GitServiceBase에서 is_git_installed 함수 모킹
        self.patch_is_git = patch('gitmanager.git.core.services.base_service.is_git_installed')
        self.mock_is_git = self.patch_is_git.start()
        self.mock_is_git.return_value = True
        
        # 서비스 인스턴스 생성
        self.hooks_service = GitHooksService(self.repo_path)

    def tearDown(self):
        """각 테스트 실행 후 정리"""
        # 모든 패치 중지
        self.patch_run_git.stop()
        self.patch_cache.stop()
        self.patch_exists.stop()
        self.patch_makedirs.stop()
        self.patch_listdir.stop()
        self.patch_open.stop()
        self.patch_stat.stop()
        self.patch_chmod.stop()
        self.patch_remove.stop()
        self.patch_copy.stop()
        self.patch_is_git.stop()
        
        # 임시 디렉토리 삭제
        if os.path.exists(self.repo_path):
            import shutil
            shutil.rmtree(self.repo_path)

    def test_get_hook_path(self):
        """_get_hook_path 메서드 테스트"""
        # 유효한 훅 이름으로 호출
        hook_path = self.hooks_service._get_hook_path("pre-commit")
        expected_path = os.path.join(self.hooks_dir, "pre-commit")
        self.assertEqual(hook_path, expected_path)
        
        # 유효하지 않은 훅 이름으로 호출 시 예외 발생
        with self.assertRaises(GitHooksException):
            self.hooks_service._get_hook_path("invalid-hook")

    def test_is_hook_executable(self):
        """_is_hook_executable 메서드 테스트"""
        # 실행 권한이 있는 경우
        self.mock_stat_result.st_mode = stat.S_IFREG | stat.S_IXUSR
        result = self.hooks_service._is_hook_executable("dummy_path")
        self.assertTrue(result)
        
        # 실행 권한이 없는 경우
        self.mock_stat_result.st_mode = stat.S_IFREG
        result = self.hooks_service._is_hook_executable("dummy_path")
        self.assertFalse(result)
        
        # 파일이 존재하지 않는 경우
        self.mock_exists.return_value = False
        result = self.hooks_service._is_hook_executable("dummy_path")
        self.assertFalse(result)

    def test_set_hook_executable(self):
        """_set_hook_executable 메서드 테스트"""
        # 실행 권한 설정 성공
        self.mock_stat_result.st_mode = stat.S_IFREG
        result = self.hooks_service._set_hook_executable("dummy_path", True)
        self.assertTrue(result)
        self.mock_chmod.assert_called_once()
        
        # 실행 권한 해제 성공
        self.mock_chmod.reset_mock()
        result = self.hooks_service._set_hook_executable("dummy_path", False)
        self.assertTrue(result)
        self.mock_chmod.assert_called_once()
        
        # 파일이 존재하지 않는 경우
        self.mock_exists.return_value = False
        result = self.hooks_service._set_hook_executable("dummy_path")
        self.assertFalse(result)
        
        # 권한 설정 실패
        self.mock_exists.return_value = True
        self.mock_chmod.side_effect = OSError("Permission denied")
        result = self.hooks_service._set_hook_executable("dummy_path")
        self.assertFalse(result)

    def test_list_available_hooks_from_cache(self):
        """list_available_hooks 메서드 - 캐시에서 조회 테스트"""
        # 캐시에서 가져오는 경우
        cache_data = {
            "success": True,
            "hooks": [{"name": "pre-commit", "is_active": True}]
        }
        self.mock_cache_instance.get.return_value = cache_data
        
        with patch.object(GitHooksService, 'get_from_cache', return_value=cache_data):
            result = self.hooks_service.list_available_hooks()
        
        self.assertEqual(result, cache_data)

    def test_list_available_hooks_from_git(self):
        """list_available_hooks 메서드 - Git에서 조회 테스트"""
        # 캐시에 없는 경우
        with patch.object(GitHooksService, 'get_from_cache', return_value=None):
            # 훅 디렉토리에 파일 목록
            hook_files = [
                "pre-commit",
                "commit-msg.sample",
                "pre-push"
            ]
            self.mock_listdir.return_value = hook_files
            
            # pre-commit과 pre-push는 실행 가능, commit-msg.sample은 불가능
            def mock_is_executable(path):
                return "sample" not in path
            
            # 파일 존재 여부
            def mock_is_file(path):
                return True
            
            with patch('os.path.isfile', side_effect=mock_is_file):
                with patch.object(GitHooksService, '_is_hook_executable', side_effect=mock_is_executable):
                    with patch.object(GitHooksService, 'set_to_cache') as mock_set_cache:
                        result = self.hooks_service.list_available_hooks()
        
        self.assertTrue(result["success"])
        self.assertEqual(len(result["hooks"]), 3)
        
        # 각 훅 확인
        hook_pre_commit = next((h for h in result["hooks"] if h["name"] == "pre-commit"), None)
        self.assertIsNotNone(hook_pre_commit)
        self.assertTrue(hook_pre_commit["is_active"])
        self.assertFalse(hook_pre_commit["is_sample"])
        
        hook_commit_msg = next((h for h in result["hooks"] if h["name"] == "commit-msg"), None)
        self.assertIsNotNone(hook_commit_msg)
        self.assertFalse(hook_commit_msg["is_active"])
        self.assertTrue(hook_commit_msg["is_sample"])
        
        # 캐시 저장 확인
        mock_set_cache.assert_called_once()

    def test_list_available_hooks_error(self):
        """list_available_hooks 메서드 - 오류 처리 테스트"""
        # 캐시에 없는 경우
        with patch.object(GitHooksService, 'get_from_cache', return_value=None):
            # 훅 디렉토리가 없는 경우
            self.mock_exists.return_value = False
            
            result = self.hooks_service.list_available_hooks()
        
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("훅 디렉토리가 존재하지 않습니다", result["error"])

    def test_list_active_hooks(self):
        """list_active_hooks 메서드 테스트"""
        # list_available_hooks 모킹
        hooks_data = {
            "success": True,
            "hooks": [
                {"name": "pre-commit", "is_active": True},
                {"name": "commit-msg", "is_active": False},
                {"name": "pre-push", "is_active": True}
            ]
        }
        
        with patch.object(GitHooksService, 'list_available_hooks', return_value=hooks_data):
            result = self.hooks_service.list_active_hooks()
        
        self.assertTrue(result["success"])
        self.assertEqual(len(result["hooks"]), 2)  # 활성화된 훅 2개만 포함
        
        # 훅 이름 확인
        hook_names = [h["name"] for h in result["hooks"]]
        self.assertIn("pre-commit", hook_names)
        self.assertIn("pre-push", hook_names)
        self.assertNotIn("commit-msg", hook_names)
        
        # 오류가 발생한 경우
        hooks_error = {
            "success": False,
            "error": "조회 오류"
        }
        
        with patch.object(GitHooksService, 'list_available_hooks', return_value=hooks_error):
            result = self.hooks_service.list_active_hooks()
        
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "조회 오류")

    def test_get_hook_content(self):
        """get_hook_content 메서드 테스트"""
        hook_name = "pre-commit"
        hook_content = "#!/bin/bash\necho 'Running pre-commit hook'\nexit 0"
        
        # 훅 파일이 존재하고 실행 가능한 경우
        self.mock_exists.side_effect = lambda path: True
        self.mock_open.return_value.read.return_value = hook_content
        
        with patch.object(GitHooksService, '_is_hook_executable', return_value=True):
            result = self.hooks_service.get_hook_content(hook_name)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["name"], hook_name)
        self.assertEqual(result["content"], hook_content)
        self.assertTrue(result["is_active"])
        
        # 훅 파일이 없고 샘플만 있는 경우
        sample_content = "#!/bin/bash\n# Sample hook script"
        self.mock_exists.side_effect = lambda path: ".sample" in path
        self.mock_open.return_value.read.return_value = sample_content
        
        result = self.hooks_service.get_hook_content(hook_name)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["content"], sample_content)
        self.assertTrue(result["is_sample"])
        
        # 훅 파일과 샘플 모두 없는 경우
        self.mock_exists.return_value = False
        
        result = self.hooks_service.get_hook_content(hook_name)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["content"], "# 새 Git 훅 스크립트")
        
        # 오류가 발생한 경우
        self.mock_exists.side_effect = Exception("테스트 오류")
        
        result = self.hooks_service.get_hook_content(hook_name)
        
        self.assertFalse(result["success"])
        self.assertEqual(result["name"], hook_name)
        self.assertIn("error", result)

    def test_set_hook_content(self):
        """set_hook_content 메서드 테스트"""
        hook_name = "pre-commit"
        hook_content = "#!/bin/bash\necho 'Custom hook content'\nexit 0"
        
        # 정상 설정
        result = self.hooks_service.set_hook_content(hook_name, hook_content)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["name"], hook_name)
        self.assertTrue(result["is_active"])
        self.mock_open.assert_called_with(os.path.join(self.hooks_dir, hook_name), 'w')
        self.mock_open.return_value.write.assert_called_with(hook_content)
        
        # 디렉토리가 없는 경우
        self.mock_exists.return_value = False
        
        result = self.hooks_service.set_hook_content(hook_name, hook_content)
        
        self.assertTrue(result["success"])
        self.mock_makedirs.assert_called_with(self.hooks_dir, exist_ok=True)
        
        # 실행 권한 없이 설정
        result = self.hooks_service.set_hook_content(hook_name, hook_content, False)
        
        self.assertTrue(result["success"])
        self.assertFalse(result["is_active"])
        
        # 오류가 발생한 경우
        self.mock_open.side_effect = IOError("파일 쓰기 오류")
        
        result = self.hooks_service.set_hook_content(hook_name, hook_content)
        
        self.assertFalse(result["success"])
        self.assertEqual(result["name"], hook_name)
        self.assertIn("error", result)

    def test_enable_hook(self):
        """enable_hook 메서드 테스트"""
        hook_name = "pre-commit"
        
        # 훅 파일이 있는 경우
        self.mock_exists.return_value = True
        
        with patch.object(GitHooksService, '_set_hook_executable', return_value=True):
            with patch.object(GitHooksService, '_invalidate_hooks_cache'):
                result = self.hooks_service.enable_hook(hook_name)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["name"], hook_name)
        
        # 훅 파일이 없고 샘플이 있는 경우
        self.mock_exists.side_effect = lambda path: ".sample" in path
        
        with patch.object(GitHooksService, '_set_hook_executable', return_value=True):
            with patch.object(GitHooksService, '_invalidate_hooks_cache'):
                result = self.hooks_service.enable_hook(hook_name)
        
        self.assertTrue(result["success"])
        self.mock_copy.assert_called_once()
        
        # 훅 파일과 샘플 모두 없는 경우
        self.mock_exists.return_value = False
        
        result = self.hooks_service.enable_hook(hook_name)
        
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        
        # 권한 설정 실패
        self.mock_exists.return_value = True
        
        with patch.object(GitHooksService, '_set_hook_executable', return_value=False):
            result = self.hooks_service.enable_hook(hook_name)
        
        self.assertFalse(result["success"])
        self.assertIn("훅 활성화 실패", result["error"])

    def test_disable_hook(self):
        """disable_hook 메서드 테스트"""
        hook_name = "pre-commit"
        
        # 훅 파일이 있는 경우
        self.mock_exists.return_value = True
        
        with patch.object(GitHooksService, '_set_hook_executable', return_value=True):
            with patch.object(GitHooksService, '_invalidate_hooks_cache'):
                result = self.hooks_service.disable_hook(hook_name)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["name"], hook_name)
        
        # 훅 파일이 없는 경우
        self.mock_exists.return_value = False
        
        result = self.hooks_service.disable_hook(hook_name)
        
        self.assertFalse(result["success"])
        self.assertIn("훅 파일이 존재하지 않습니다", result["error"])
        
        # 권한 설정 실패
        self.mock_exists.return_value = True
        
        with patch.object(GitHooksService, '_set_hook_executable', return_value=False):
            result = self.hooks_service.disable_hook(hook_name)
        
        self.assertFalse(result["success"])
        self.assertIn("훅 비활성화 실패", result["error"])

    def test_delete_hook(self):
        """delete_hook 메서드 테스트"""
        hook_name = "pre-commit"
        
        # 훅 파일이 있는 경우
        self.mock_exists.return_value = True
        
        with patch.object(GitHooksService, '_invalidate_hooks_cache'):
            result = self.hooks_service.delete_hook(hook_name)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["name"], hook_name)
        self.mock_remove.assert_called_once()
        
        # 훅 파일이 없는 경우
        self.mock_exists.return_value = False
        
        result = self.hooks_service.delete_hook(hook_name)
        
        self.assertFalse(result["success"])
        self.assertIn("훅 파일이 존재하지 않습니다", result["error"])
        
        # 삭제 오류
        self.mock_exists.return_value = True
        self.mock_remove.side_effect = OSError("삭제 권한 없음")
        
        result = self.hooks_service.delete_hook(hook_name)
        
        self.assertFalse(result["success"])
        self.assertIn("error", result)

    def test_install_hook_from_template(self):
        """install_hook_from_template 메서드 테스트"""
        hook_name = "pre-commit"
        template_path = "/path/to/template"
        template_content = "#!/bin/bash\necho 'Template hook content'\nexit 0"
        
        # 템플릿 파일이 있는 경우
        self.mock_exists.return_value = True
        self.mock_open.return_value.read.return_value = template_content
        
        with patch.object(GitHooksService, 'set_hook_content') as mock_set:
            mock_set.return_value = {"success": True, "name": hook_name}
            result = self.hooks_service.install_hook_from_template(hook_name, template_path)
        
        self.assertTrue(result["success"])
        self.assertEqual(result["name"], hook_name)
        self.mock_open.assert_called_with(template_path, 'r')
        
        # 템플릿 파일이 없는 경우
        self.mock_exists.return_value = False
        
        result = self.hooks_service.install_hook_from_template(hook_name, template_path)
        
        self.assertFalse(result["success"])
        self.assertIn("템플릿 파일이 존재하지 않습니다", result["error"])
        
        # 템플릿 읽기 오류
        self.mock_exists.return_value = True
        self.mock_open.side_effect = IOError("파일 읽기 오류")
        
        result = self.hooks_service.install_hook_from_template(hook_name, template_path)
        
        self.assertFalse(result["success"])
        self.assertIn("error", result)

    def test_invalidate_hooks_cache(self):
        """_invalidate_hooks_cache 메서드 테스트"""
        # 캐시 무효화 호출 확인
        with patch.object(GitHooksService, 'invalidate_cache_by_pattern') as mock_invalidate:
            self.hooks_service._invalidate_hooks_cache()
            mock_invalidate.assert_called_once_with("hooks:*")


if __name__ == '__main__':
    unittest.main() 