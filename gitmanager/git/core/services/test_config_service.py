"""
GitConfigService 테스트 모듈

이 모듈은 GitConfigService 클래스의 메소드를 테스트합니다.
"""

import os
import unittest
from unittest.mock import patch, MagicMock, call
import tempfile

from gitmanager.git.core.exceptions import GitCommandException, GitConfigException
from gitmanager.git.core.services.config_service import GitConfigService


class TestGitConfigService(unittest.TestCase):
    """
    GitConfigService 클래스 테스트 케이스
    """
    
    def setUp(self):
        """
        테스트 환경 설정
        """
        # 임시 저장소 경로 생성
        self.repo_path = tempfile.mkdtemp()
        
        # 캐시 관리자 모의 객체 생성
        self.mock_cache_manager = MagicMock()
        
        # GitConfigService 객체 생성 및 캐시 관리자 패치
        patcher = patch('gitmanager.git.core.services.base_service.get_unified_cache_manager')
        self.mock_get_cache_manager = patcher.start()
        self.mock_get_cache_manager.return_value = self.mock_cache_manager
        
        # GitCommandExecutor 모의 객체 생성
        patcher2 = patch('gitmanager.git.core.services.base_service.GitServiceBase._run_git_command')
        self.mock_run_git_command = patcher2.start()
        
        # is_git_installed 함수 모킹
        patcher3 = patch('gitmanager.git.core.services.base_service.is_git_installed')
        self.mock_is_git = patcher3.start()
        self.mock_is_git.return_value = True
        
        # 클린업을 위해 패처 추가
        self.addCleanup(patcher.stop)
        self.addCleanup(patcher2.stop)
        self.addCleanup(patcher3.stop)
        
        # 서비스 객체 생성
        self.config_service = GitConfigService(self.repo_path)
    
    def tearDown(self):
        """
        테스트 환경 정리
        """
        # 임시 디렉토리 삭제
        try:
            import shutil
            shutil.rmtree(self.repo_path)
        except:
            pass
    
    def test_get_config_from_cache(self):
        """
        캐시에서 설정 조회 테스트
        """
        # 캐시 히트 설정
        cache_data = {
            "success": True,
            "value": "test@example.com",
            "key": "user.email",
            "scope": "local"
        }
        self.mock_cache_manager.get.return_value = cache_data
        
        # get_from_cache 메서드 모킹
        with patch.object(GitConfigService, 'get_from_cache', return_value=cache_data):
            # 메소드 호출
            result = self.config_service.get_config("user.email", "local")
            
            # 결과 검증
            self.assertTrue(result["success"])
            self.assertEqual(result["value"], "test@example.com")
            self.assertEqual(result["key"], "user.email")
            self.assertEqual(result["scope"], "local")
            
            # Git 명령 실행 안됨 검증
            self.mock_run_git_command.assert_not_called()
    
    def test_get_config_from_git(self):
        """
        Git 명령을 통한 설정 조회 테스트
        """
        # 캐시 미스 설정
        with patch.object(GitConfigService, 'get_from_cache', return_value=None):
            # Git 명령어 실행 결과 설정
            self.mock_run_git_command.return_value = "John Doe\n"
            
            # set_to_cache 메서드 모킹
            with patch.object(GitConfigService, 'set_to_cache') as mock_set_cache:
                # 메소드 호출
                result = self.config_service.get_config("user.name", "local")
                
                # 결과 검증
                self.assertTrue(result["success"])
                self.assertEqual(result["value"], "John Doe")
                self.assertEqual(result["key"], "user.name")
                self.assertEqual(result["scope"], "local")
                
                # Git 명령 호출 검증
                self.mock_run_git_command.assert_called_once_with("config --get user.name")
                
                # 캐시 설정 검증
                mock_set_cache.assert_called_once()
    
    def test_get_config_error(self):
        """
        설정 조회 오류 테스트
        """
        # 캐시 미스 설정
        with patch.object(GitConfigService, 'get_from_cache', return_value=None):
            # Git 명령어 실행 오류 설정
            self.mock_run_git_command.side_effect = GitCommandException("설정을 찾을 수 없습니다")
            
            # 메소드 호출
            result = self.config_service.get_config("invalid.key", "local")
            
            # 결과 검증
            self.assertFalse(result["success"])
            self.assertEqual(result["key"], "invalid.key")
            self.assertEqual(result["scope"], "local")
            self.assertIn("error", result)
            
            # Git 명령 호출 검증
            self.mock_run_git_command.assert_called_once()
    
    def test_set_config(self):
        """
        설정 변경 테스트
        """
        # invalidate_config_cache 메서드 모킹
        with patch.object(GitConfigService, '_invalidate_config_cache') as mock_invalidate:
            # 메소드 호출
            result = self.config_service.set_config("user.name", "Jane Doe", "local")
            
            # 결과 검증
            self.assertTrue(result["success"])
            self.assertEqual(result["key"], "user.name")
            self.assertEqual(result["value"], "Jane Doe")
            self.assertEqual(result["scope"], "local")
            
            # Git 명령 호출 검증
            self.mock_run_git_command.assert_called_once_with("config user.name Jane Doe")
            
            # 캐시 무효화 검증
            mock_invalidate.assert_called_once()
    
    def test_set_config_error(self):
        """
        설정 변경 오류 테스트
        """
        # Git 명령어 실행 오류 설정
        self.mock_run_git_command.side_effect = GitCommandException("권한이 없습니다")
        
        # 메소드 호출
        result = self.config_service.set_config("user.name", "Jane Doe", "system")
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertEqual(result["key"], "user.name")
        self.assertEqual(result["value"], "Jane Doe")
        self.assertEqual(result["scope"], "system")
        self.assertIn("error", result)
        
        # Git 명령 호출 검증
        self.mock_run_git_command.assert_called_once()
    
    def test_set_config_invalid_key(self):
        """
        유효하지 않은 키로 설정 변경 시도 테스트
        """
        # 유효하지 않은 키로 메소드 호출
        with self.assertRaises(GitConfigException):
            self.config_service.set_config("invalid-key", "value", "local")
        
        # Git 명령 호출 안됨 검증
        self.mock_run_git_command.assert_not_called()
    
    def test_unset_config(self):
        """
        설정 제거 테스트
        """
        # invalidate_config_cache 메서드 모킹
        with patch.object(GitConfigService, '_invalidate_config_cache') as mock_invalidate:
            # 메소드 호출
            result = self.config_service.unset_config("user.name", "local")
            
            # 결과 검증
            self.assertTrue(result["success"])
            self.assertEqual(result["key"], "user.name")
            self.assertEqual(result["scope"], "local")
            
            # Git 명령 호출 검증
            self.mock_run_git_command.assert_called_once_with("config --unset user.name")
            
            # 캐시 무효화 검증
            mock_invalidate.assert_called_once()
    
    def test_unset_config_error(self):
        """
        설정 제거 오류 테스트
        """
        # Git 명령어 실행 오류 설정
        self.mock_run_git_command.side_effect = GitCommandException("설정을 찾을 수 없습니다")
        
        # 메소드 호출
        result = self.config_service.unset_config("user.name", "local")
        
        # 결과 검증
        self.assertFalse(result["success"])
        self.assertEqual(result["key"], "user.name")
        self.assertEqual(result["scope"], "local")
        self.assertIn("error", result)
        
        # Git 명령 호출 검증
        self.mock_run_git_command.assert_called_once()
    
    def test_list_config(self):
        """
        설정 목록 조회 테스트
        """
        # 캐시 미스 설정
        with patch.object(GitConfigService, 'get_from_cache', return_value=None):
            # Git 명령어 실행 결과 설정
            self.mock_run_git_command.return_value = """
user.name=John Doe
user.email=john@example.com
core.editor=vim
"""
            
            # set_to_cache 메서드 모킹
            with patch.object(GitConfigService, 'set_to_cache') as mock_set_cache:
                # 메소드 호출
                result = self.config_service.list_config("local")
                
                # 결과 검증
                self.assertTrue(result["success"])
                self.assertEqual(result["scope"], "local")
                self.assertEqual(len(result["configs"]), 3)
                self.assertEqual(result["configs"]["user.name"], "John Doe")
                self.assertEqual(result["configs"]["user.email"], "john@example.com")
                self.assertEqual(result["configs"]["core.editor"], "vim")
                
                # Git 명령 호출 검증
                self.mock_run_git_command.assert_called_once_with("config --local --list")
                
                # 캐시 설정 검증
                mock_set_cache.assert_called_once()
    
    def test_list_config_from_cache(self):
        """
        캐시에서 설정 목록 조회 테스트
        """
        # 캐시 데이터 설정
        cache_data = {
            "success": True,
            "configs": {
                "user.name": "John Doe",
                "user.email": "john@example.com"
            },
            "scope": "local"
        }
        
        # get_from_cache 메서드 모킹
        with patch.object(GitConfigService, 'get_from_cache', return_value=cache_data):
            # 메소드 호출
            result = self.config_service.list_config("local")
            
            # 결과 검증
            self.assertTrue(result["success"])
            self.assertEqual(result["scope"], "local")
            self.assertEqual(len(result["configs"]), 2)
            self.assertEqual(result["configs"]["user.name"], "John Doe")
            self.assertEqual(result["configs"]["user.email"], "john@example.com")
            
            # Git 명령 호출 안됨 검증
            self.mock_run_git_command.assert_not_called()
    
    def test_list_config_all_scopes(self):
        """
        모든 설정 범위의 설정 목록 조회 테스트
        """
        # 캐시 미스 설정
        with patch.object(GitConfigService, 'get_from_cache', return_value=None):
            # Git 명령어 실행 결과 설정
            self.mock_run_git_command.return_value = """
user.name=John Doe
user.email=john@example.com
core.editor=vim
"""
            
            # 메소드 호출
            result = self.config_service.list_config("all")
            
            # 결과 검증
            self.assertTrue(result["success"])
            self.assertEqual(result["scope"], "all")
            self.assertEqual(len(result["configs"]), 3)
            
            # Git 명령 호출 검증
            self.mock_run_git_command.assert_called_once_with("config --list")
    
    def test_invalid_scope(self):
        """
        유효하지 않은 범위 테스트
        """
        # 유효하지 않은 범위로 메소드 호출
        with self.assertRaises(GitConfigException):
            self.config_service.get_config("user.name", "invalid")
        
        # Git 명령 호출 안됨 검증
        self.mock_run_git_command.assert_not_called()
    
    def test_get_config_location_local(self):
        """
        로컬 설정 파일 위치 조회 테스트
        """
        # os.path.exists 모킹
        with patch('os.path.exists', return_value=True):
            # 메소드 호출
            result = self.config_service.get_config_location("local")
            
            # 결과 검증
            self.assertTrue(result["success"])
            self.assertEqual(result["scope"], "local")
            expected_path = os.path.join(self.repo_path, ".git", "config")
            self.assertEqual(result["location"], expected_path)
            
            # Git 명령 호출 안됨 검증
            self.mock_run_git_command.assert_not_called()
    
    def test_get_config_location_global(self):
        """
        글로벌 설정 파일 위치 조회 테스트
        """
        # Git 명령어 실행 결과 설정
        self.mock_run_git_command.return_value = "file:/home/user/.gitconfig\tuser.name=John Doe"
        
        # 메소드 호출
        result = self.config_service.get_config_location("global")
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertEqual(result["scope"], "global")
        self.assertEqual(result["location"], "/home/user/.gitconfig")
        
        # Git 명령 호출 검증
        self.mock_run_git_command.assert_called_once_with("config --list --show-origin --global")
    
    def test_get_config_location_system(self):
        """
        시스템 설정 파일 위치 조회 테스트
        """
        # Git 명령어 실행 오류 설정
        self.mock_run_git_command.side_effect = GitCommandException("설정을 찾을 수 없습니다")
        
        # 메소드 호출
        result = self.config_service.get_config_location("system")
        
        # 결과 검증
        self.assertTrue(result["success"])
        self.assertEqual(result["scope"], "system")
        self.assertEqual(result["location"], "/etc/gitconfig")
        
        # Git 명령 호출 검증
        self.mock_run_git_command.assert_called_once()


if __name__ == "__main__":
    unittest.main() 