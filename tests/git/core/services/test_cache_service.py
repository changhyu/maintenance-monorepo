"""
GitCacheService 클래스에 대한 단위 테스트
"""
import os
import unittest
import time
from unittest.mock import patch, MagicMock, PropertyMock, call
from typing import Dict, List, Any

from gitmanager.git.core.services.cache_service import GitCacheService
from gitmanager.git.core.exceptions import GitCacheException


class TestGitCacheService(unittest.TestCase):
    """GitCacheService 클래스에 대한 테스트 케이스"""

    @patch('gitmanager.git.core.services.base_service.is_git_installed')
    @patch('gitmanager.git.core.services.base_service.get_unified_cache_manager')
    def setUp(self, mock_cache_manager, mock_is_git_installed):
        """테스트 셋업"""
        mock_is_git_installed.return_value = True
        self.mock_cache_manager = mock_cache_manager.return_value
        self.test_repo_path = '/tmp/test_repo'
        self.service = GitCacheService(repo_path=self.test_repo_path)

    def test_init(self):
        """초기화 테스트"""
        self.assertEqual(self.service.repo_path, self.test_repo_path)
        self.assertFalse(self.service.bare)

    @patch.object(GitCacheService, 'get_cache_stats')
    def test_get_cache_stats(self, mock_get_cache_stats):
        """캐시 통계 조회 테스트"""
        # 캐시 통계 모의 설정
        mock_stats = {
            "hits": 100,
            "misses": 20,
            "hit_ratio": 0.83,
            "items": 50,
            "memory_mb": 10.5
        }
        mock_get_cache_stats.return_value = mock_stats
        
        # 통계 조회
        stats = self.service.get_cache_stats()
        
        # 결과 검증
        self.assertEqual(stats, mock_stats)
        self.assertEqual(stats["hits"], 100)
        self.assertEqual(stats["misses"], 20)
        self.assertEqual(stats["hit_ratio"], 0.83)

    @patch.object(GitCacheService, 'invalidate_cache_by_pattern')
    def test_clear_cache_with_pattern(self, mock_invalidate_by_pattern):
        """패턴을 사용한 캐시 삭제 테스트"""
        # 삭제된 항목 수 모의 설정
        mock_invalidate_by_pattern.return_value = 5
        
        # 특정 패턴의 캐시 삭제
        count = self.service.clear_cache(pattern="repo*")
        
        # 결과 검증
        self.assertEqual(count, 5)
        mock_invalidate_by_pattern.assert_called_once_with("repo*")

    def test_clear_cache_all(self):
        """전체 캐시 삭제 테스트"""
        # 테스트 대상 함수 호출
        count = self.service.clear_cache()
        
        # 결과 검증
        self.assertEqual(count, -1)  # 전체 삭제는 항목 수를 알 수 없음
        self.mock_cache_manager.clear.assert_called_once()

    @patch.object(GitCacheService, 'get_cache_stats')
    def test_optimize_cache(self, mock_get_cache_stats):
        """캐시 최적화 테스트"""
        # 최적화 전/후 통계 모의 설정
        mock_get_cache_stats.side_effect = [
            {"current_items": 100, "current_memory_mb": 20.0},  # 최적화 전
            {"current_items": 80, "current_memory_mb": 15.0}   # 최적화 후
        ]
        
        # 최적화 실행
        result = self.service.optimize_cache()
        
        # 결과 검증
        self.assertEqual(result["before"]["items"], 100)
        self.assertEqual(result["before"]["memory_mb"], 20.0)
        self.assertEqual(result["after"]["items"], 80)
        self.assertEqual(result["after"]["memory_mb"], 15.0)
        self.assertEqual(result["items_removed"], 20)
        self.assertEqual(result["memory_freed_mb"], 5.0)
        
        # 캐시 매니저의 최적화 메서드 호출 확인
        self.mock_cache_manager.optimize_cache.assert_called_once()

    def test_get_cache_item_details(self):
        """캐시 항목 상세 정보 조회 테스트"""
        # 캐시 항목 모의 설정
        mock_item1 = MagicMock()
        mock_item1.size = 1024
        mock_item1.created_at = time.time() - 3600  # 1시간 전 생성
        mock_item1.last_accessed_at = time.time() - 1800  # 30분 전 접근
        mock_item1.access_count = 10
        mock_item1.ttl = 7200
        mock_item1.age.return_value = 3600
        mock_item1.idle_time.return_value = 1800
        mock_item1.time_to_expiry.return_value = 3600
        mock_item1.is_expired.return_value = False
        
        mock_item2 = MagicMock()
        mock_item2.size = 2048
        mock_item2.created_at = time.time() - 7200  # 2시간 전 생성
        mock_item2.last_accessed_at = time.time() - 3600  # 1시간 전 접근
        mock_item2.access_count = 5
        mock_item2.ttl = 3600
        mock_item2.age.return_value = 7200
        mock_item2.idle_time.return_value = 3600
        mock_item2.time_to_expiry.return_value = 0
        mock_item2.is_expired.return_value = True
        
        # 캐시 항목 딕셔너리 설정
        self.mock_cache_manager.cache = {
            "repo:1234:status": mock_item1,
            "repo:1234:branches": mock_item2
        }
        # _repo_id 설정
        self.service._repo_id = "repo:1234"
        
        # 캐시 항목 상세 정보 조회
        items = self.service.get_cache_item_details()
        
        # 결과 검증
        self.assertEqual(len(items), 2)
        
        # 크기 기준 내림차순 정렬 확인
        self.assertEqual(items[0]["key"], "repo:1234:branches")
        self.assertEqual(items[0]["size"], 2048)
        self.assertEqual(items[0]["type"], "브랜치")
        self.assertTrue(items[0]["is_expired"])
        
        self.assertEqual(items[1]["key"], "repo:1234:status")
        self.assertEqual(items[1]["size"], 1024)
        self.assertEqual(items[1]["type"], "상태")
        self.assertFalse(items[1]["is_expired"])

    def test_get_cache_item(self):
        """특정 캐시 항목 조회 테스트"""
        # 캐시 항목 모의 설정
        mock_item = MagicMock()
        mock_item.size = 1024
        mock_item.created_at = time.time() - 3600
        mock_item.last_accessed_at = time.time() - 1800
        mock_item.access_count = 10
        mock_item.ttl = 7200
        mock_item.age.return_value = 3600
        mock_item.idle_time.return_value = 1800
        mock_item.time_to_expiry.return_value = 3600
        mock_item.is_expired.return_value = False
        mock_item.data = {"status": "clean"}
        
        # 캐시 항목 딕셔너리 설정
        self.mock_cache_manager.cache = {
            "repo:1234:status": mock_item
        }
        
        # 특정 캐시 항목 조회
        item_info = self.service.get_cache_item("repo:1234:status")
        
        # 결과 검증
        self.assertIsNotNone(item_info)
        self.assertEqual(item_info["key"], "repo:1234:status")
        self.assertEqual(item_info["size"], 1024)
        self.assertEqual(item_info["access_count"], 10)
        self.assertEqual(item_info["value"], {"status": "clean"})
        
        # 존재하지 않는 항목 조회
        item_info = self.service.get_cache_item("non-existent-key")
        self.assertIsNone(item_info)

    def test_invalidate_key(self):
        """특정 캐시 키 무효화 테스트"""
        # 캐시 항목 딕셔너리 설정
        self.mock_cache_manager.cache = {
            "repo:1234:status": MagicMock()
        }
        
        # remove 메서드 모의 설정
        self.mock_cache_manager.remove = MagicMock()
        
        # 존재하는 키 무효화
        result = self.service.invalidate_key("repo:1234:status")
        
        # 결과 검증
        self.assertTrue(result)
        self.mock_cache_manager.remove.assert_called_once_with("repo:1234:status")
        
        # 존재하지 않는 키 무효화
        self.mock_cache_manager.remove.reset_mock()
        result = self.service.invalidate_key("non-existent-key")
        
        # 결과 검증
        self.assertFalse(result)
        self.mock_cache_manager.remove.assert_not_called()

    def test_invalidate_cache_by_pattern(self):
        """패턴 기반 캐시 무효화 테스트"""
        import re
        
        # 캐시 항목 딕셔너리 설정
        self.mock_cache_manager.cache = {
            "repo:1234:status": MagicMock(),
            "repo:1234:branches": MagicMock(),
            "repo:1234:tags": MagicMock(),
            "repo:5678:status": MagicMock()
        }
        
        # remove 메서드 모의 설정
        self.mock_cache_manager.remove = MagicMock()
        
        # 패턴에 맞는 키 무효화
        result = self.service.invalidate_cache_by_pattern("repo:1234")
        
        # 결과 검증
        self.assertEqual(result, 3)  # 3개 항목 삭제됨
        self.assertEqual(self.mock_cache_manager.remove.call_count, 3)
        self.mock_cache_manager.remove.assert_has_calls([
            call("repo:1234:status"),
            call("repo:1234:branches"),
            call("repo:1234:tags")
        ], any_order=True)

    def test_enable_disk_cache(self):
        """디스크 캐시 활성화 테스트"""
        # 디스크 캐시 활성화
        result = self.service.enable_disk_cache(enabled=True, directory="/tmp/cache")
        
        # 결과 검증
        self.assertTrue(result)
        self.assertTrue(self.mock_cache_manager.enable_disk_cache)
        self.assertEqual(self.mock_cache_manager.cache_dir, "/tmp/cache")
        
        # 디스크 캐시 비활성화
        result = self.service.enable_disk_cache(enabled=False)
        
        # 결과 검증
        self.assertTrue(result)
        self.assertFalse(self.mock_cache_manager.enable_disk_cache)

    @patch('os.makedirs')
    def test_save_cache_to_disk(self, mock_makedirs):
        """캐시를 디스크에 저장 테스트"""
        # 캐시 항목 모의 설정
        mock_item1 = MagicMock()
        mock_item1.data = {"status": "clean"}
        
        mock_item2 = MagicMock()
        mock_item2.data = {"branches": ["main", "dev"]}
        
        # 캐시 항목 딕셔너리 설정
        self.mock_cache_manager.cache = {
            "repo:1234:status": mock_item1,
            "repo:1234:branches": mock_item2,
            "other:key": MagicMock()
        }
        
        # _repo_id 설정
        self.service._repo_id = "repo:1234"
        
        # _save_to_disk 메서드 모의 설정
        self.mock_cache_manager._save_to_disk = MagicMock()
        
        # 캐시를 디스크에 저장
        result = self.service.save_cache_to_disk(directory="/tmp/cache")
        
        # 결과 검증
        self.assertTrue(result)
        mock_makedirs.assert_called_once_with("/tmp/cache", exist_ok=True)
        self.assertEqual(self.mock_cache_manager.cache_dir, "/tmp/cache")
        
        # 저장소 관련 캐시 항목만 저장했는지 확인
        self.assertEqual(self.mock_cache_manager._save_to_disk.call_count, 2)
        self.mock_cache_manager._save_to_disk.assert_has_calls([
            call("repo:1234:status", mock_item1.data),
            call("repo:1234:branches", mock_item2.data)
        ], any_order=True) 