"""
GitStatusService 클래스에 대한 테스트 모듈

이 모듈은 저장소 상태 관련 기능을 테스트합니다.
"""

import unittest
from unittest.mock import MagicMock, patch
import os
import tempfile
import shutil

from gitmanager.git.core.services.status_service import GitStatusService
from gitmanager.git.core.types import GitStatus

class TestGitStatusService(unittest.TestCase):
    """GitStatusService 클래스 테스트"""
    
    def setUp(self):
        """테스트 셋업"""
        self.temp_dir = tempfile.mkdtemp()
        
        # is_git_installed 함수 모킹
        self.is_git_patcher = patch('gitmanager.git.core.services.base_service.is_git_installed')
        self.mock_is_git = self.is_git_patcher.start()
        self.mock_is_git.return_value = True
        
        # GitServiceBase._run_git_command 메서드 모킹
        self.run_git_patcher = patch('gitmanager.git.core.services.base_service.GitServiceBase._run_git_command')
        self.mock_run_git = self.run_git_patcher.start()
        
        self.status_service = GitStatusService(self.temp_dir)
        # 서비스 객체의 _run_git_command를 직접 모킹
        self.status_service._run_git_command = MagicMock()
        
    def tearDown(self):
        """테스트 정리"""
        # 패처 중지
        self.is_git_patcher.stop()
        self.run_git_patcher.stop()
        
        # 임시 디렉토리 제거
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_get_status_clean_repo(self):
        """깨끗한 저장소 상태 조회 테스트"""
        # 모의 반환값 설정
        self.status_service._run_git_command = MagicMock(side_effect=[
            "main",  # branch 조회
            "abc123|테스터|test@example.com|테스트 커밋|2025-05-01 12:30:45 +0900",  # 커밋 정보
            "## main...origin/main",  # 상태 정보
            "origin/main",  # upstream 확인
            "0 0"  # ahead/behind 정보
        ])
        
        # 캐시 사용하지 않도록 모의 설정
        with patch.object(GitStatusService, 'get_from_cache', return_value=None):
            with patch.object(GitStatusService, 'set_to_cache') as _:
                # 함수 호출
                result = self.status_service.get_status(use_cache=False)
                
                # 결과 검증
                self.assertTrue(result["success"])
                self.assertEqual(result["branch"], "main")
                self.assertEqual(result["has_changes"], False)
                self.assertEqual(result["modified_files"], 0)
                self.assertEqual(result["last_commit"]["hash"], "abc123")
                self.assertEqual(result["status"].is_clean, True)
                self.assertEqual(result["status"].ahead, 0)
                self.assertEqual(result["status"].behind, 0)
        
    def test_get_status_with_changes(self):
        """변경사항이 있는 저장소 상태 조회 테스트"""
        # 모의 반환값 설정 - 변경된 파일 포함
        self.status_service._run_git_command = MagicMock(side_effect=[
            "feature",  # branch 조회
            "def456|테스터|test@example.com|기능 추가|2025-05-01 14:30:45 +0900",  # 커밋 정보
            "## feature...origin/feature\n M file1.txt\n?? file2.txt",  # 상태 정보
            "origin/feature",  # upstream 확인
            "2 1"  # ahead/behind 정보
        ])
        
        # 캐시 모의 설정
        with patch.object(GitStatusService, 'get_from_cache', return_value=None):
            with patch.object(GitStatusService, 'set_to_cache') as _:
                # 함수 호출
                result = self.status_service.get_status()
                
                # 결과 검증
                self.assertTrue(result["success"])
                self.assertEqual(result["branch"], "feature")
                self.assertEqual(result["has_changes"], True)
                self.assertGreater(result["modified_files"], 0)
                self.assertEqual(result["last_commit"]["hash"], "def456")
                self.assertEqual(result["status"].is_clean, False)
                self.assertEqual(result["status"].ahead, 2)
                self.assertEqual(result["status"].behind, 1)
        
    def test_get_status_with_conflicts(self):
        """충돌이 있는 저장소 상태 조회 테스트"""
        # 모의 반환값 설정 - 충돌 포함
        self.status_service._run_git_command = MagicMock(side_effect=[
            "merge-branch",  # branch 조회
            "ghi789|테스터|test@example.com|병합 중|2025-05-01 15:30:45 +0900",  # 커밋 정보
            "## merge-branch\nUU conflict.txt",  # 상태 정보 (충돌)
            "fatal: no upstream configured for branch 'merge-branch'"  # upstream 없음
        ])
        
        # 캐시 모의 설정
        with patch.object(GitStatusService, 'get_from_cache', return_value=None):
            with patch.object(GitStatusService, 'set_to_cache') as _:
                # 함수 호출
                result = self.status_service.get_status()
                
                # 결과 검증
                self.assertTrue(result["success"])
                self.assertEqual(result["branch"], "merge-branch")
                self.assertEqual(result["has_changes"], True)
                self.assertTrue(result["status"].has_conflicts)
                self.assertTrue(len(result["status"].conflicts) > 0)
        
    def test_get_status_cache_usage(self):
        """상태 캐싱 테스트"""
        # 캐시된 데이터 모의 설정
        cached_status = {
            "branch": "cached-branch",
            "modified_files": 0,
            "has_changes": False,
            "last_commit": {"hash": "cached123"},
            "status": GitStatus(
                staged=[], unstaged=[], untracked=[],
                is_clean=True, current_branch="cached-branch",
                ahead=0, behind=0, has_conflicts=False, conflicts=[]
            ),
            "success": True
        }
        
        # 캐시 히트 모의 설정
        with patch.object(GitStatusService, 'get_from_cache', return_value=cached_status):
            # 함수 호출
            result = self.status_service.get_status(use_cache=True)
            
            # 결과 검증 - 캐시된 데이터가 반환되어야 함
            self.assertEqual(result["branch"], "cached-branch")
            self.assertEqual(result["last_commit"]["hash"], "cached123")
            
            # _run_git_command가 호출되지 않았는지 확인 (캐시 사용으로)
            self.status_service._run_git_command.assert_not_called()
        
    def test_is_clean(self):
        """is_clean 메서드 테스트"""
        # get_status 모의 설정 - 깨끗한 상태
        self.status_service.get_status = MagicMock(return_value={
            "success": True,
            "has_changes": False
        })
        
        # 함수 호출 및 검증
        self.assertTrue(self.status_service.is_clean())
        
        # get_status 모의 설정 - 변경사항 있음
        self.status_service.get_status = MagicMock(return_value={
            "success": True,
            "has_changes": True
        })
        
        # 함수 호출 및 검증
        self.assertFalse(self.status_service.is_clean())
        
    def test_has_conflicts(self):
        """has_conflicts 메서드 테스트"""
        # 충돌 있는 상태
        mock_status = {
            "success": True,
            "status": GitStatus(
                staged=[], unstaged=[], untracked=[],
                is_clean=False, current_branch="feature",
                ahead=0, behind=0, has_conflicts=True, conflicts=["conflict.txt"]
            )
        }
        self.status_service.get_status = MagicMock(return_value=mock_status)
        
        # 함수 호출 및 검증
        self.assertTrue(self.status_service.has_conflicts())
        
        # 충돌 없는 상태
        mock_status["status"].has_conflicts = False
        mock_status["status"].conflicts = []
        
        # 함수 호출 및 검증
        self.assertFalse(self.status_service.has_conflicts())

if __name__ == "__main__":
    unittest.main() 