"""
Git 캐시 서비스 모듈

이 모듈은 Git 서비스 클래스들을 위한 고급 캐시 관리 기능을 제공합니다.
"""

import os
import re
import time
from typing import Any, Dict, List, Optional, Pattern, Set, Tuple

from gitmanager.git.core.services.base_service import GitServiceBase
from gitmanager.git.core.exceptions import GitCacheException

class GitCacheService(GitServiceBase):
    """
    Git 캐시 관리 서비스 클래스
    """
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보를 조회합니다.
        
        Returns:
            Dict[str, Any]: 캐시 통계 정보
        """
        # 기본 클래스 메서드 사용
        return super().get_cache_stats()
    
    def clear_cache(self, pattern: Optional[str] = None) -> int:
        """
        캐시를 삭제합니다.
        
        Args:
            pattern: 삭제할 캐시 키 패턴 (기본값: 전체)
            
        Returns:
            int: 삭제된 항목 수
        """
        try:
            if pattern:
                return self.invalidate_cache_by_pattern(pattern)
            else:
                # 전체 캐시 삭제
                self._cache_manager.clear()
                return -1  # 전체 삭제는 항목 수를 알 수 없음
        except Exception as e:
            self.logger.error(f"캐시 삭제 중 오류: {str(e)}")
            return 0
    
    def optimize_cache(self) -> Dict[str, Any]:
        """
        캐시를 최적화합니다.
        
        Returns:
            Dict[str, Any]: 최적화 결과 통계
        """
        try:
            # 최적화 전 통계
            before_stats = self.get_cache_stats()
            
            # 최적화 실행
            self._cache_manager.optimize_cache()
            
            # 최적화 후 통계
            after_stats = self.get_cache_stats()
            
            # 결과 구성
            result = {
                "before": {
                    "items": before_stats.get("current_items", 0),
                    "memory_mb": before_stats.get("current_memory_mb", 0),
                },
                "after": {
                    "items": after_stats.get("current_items", 0),
                    "memory_mb": after_stats.get("current_memory_mb", 0),
                },
                "items_removed": before_stats.get("current_items", 0) - after_stats.get("current_items", 0),
                "memory_freed_mb": before_stats.get("current_memory_mb", 0) - after_stats.get("current_memory_mb", 0),
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"캐시 최적화 중 오류: {str(e)}")
            return {
                "error": str(e)
            }
    
    def get_cache_item_details(self) -> List[Dict[str, Any]]:
        """
        캐시 항목 상세 정보를 조회합니다.
        
        Returns:
            List[Dict[str, Any]]: 캐시 항목 상세 정보
        """
        try:
            items = []
            
            # 캐시 매니저 획득
            cache_manager = self._cache_manager
            
            # 캐시 항목 순회
            with cache_manager._lock:
                for key, item in cache_manager.cache.items():
                    # 항목이 저장소에 관련된 것인지 확인
                    if self._repo_id in key:
                        # 항목 정보 구성
                        item_info = {
                            "key": key,
                            "type": self._get_cache_item_type(key),
                            "size": item.size,
                            "size_kb": round(item.size / 1024, 2),
                            "created_at": item.created_at,
                            "age": item.age(),
                            "last_accessed_at": item.last_accessed_at,
                            "idle_time": item.idle_time(),
                            "access_count": item.access_count,
                            "ttl": item.ttl,
                            "time_to_expiry": item.time_to_expiry(),
                            "is_expired": item.is_expired(),
                        }
                        items.append(item_info)
            
            # 크기 기준 내림차순 정렬
            items.sort(key=lambda x: x["size"], reverse=True)
            
            return items
            
        except Exception as e:
            self.logger.error(f"캐시 항목 상세 정보 조회 중 오류: {str(e)}")
            return []
    
    def get_cache_item(self, key: str) -> Optional[Dict[str, Any]]:
        """
        특정 캐시 항목을 조회합니다.
        
        Args:
            key: 캐시 키
            
        Returns:
            Optional[Dict[str, Any]]: 캐시 항목 정보 (없으면 None)
        """
        try:
            # 캐시 매니저 획득
            cache_manager = self._cache_manager
            
            # 캐시 항목 확인
            with cache_manager._lock:
                if key in cache_manager.cache:
                    item = cache_manager.cache[key]
                    
                    # 항목 정보 구성
                    item_info = {
                        "key": key,
                        "type": self._get_cache_item_type(key),
                        "size": item.size,
                        "size_kb": round(item.size / 1024, 2),
                        "created_at": item.created_at,
                        "age": item.age(),
                        "last_accessed_at": item.last_accessed_at,
                        "idle_time": item.idle_time(),
                        "access_count": item.access_count,
                        "ttl": item.ttl,
                        "time_to_expiry": item.time_to_expiry(),
                        "is_expired": item.is_expired(),
                        "value": item.data,  # 실제 값도 포함
                    }
                    
                    return item_info
            
            return None
            
        except Exception as e:
            self.logger.error(f"캐시 항목 조회 중 오류: {str(e)}")
            return None
    
    def invalidate_key(self, key: str) -> bool:
        """
        특정 캐시 키를 무효화합니다.
        
        Args:
            key: 캐시 키
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 캐시 매니저 획득
            cache_manager = self._cache_manager
            
            # 캐시 항목 삭제
            with cache_manager._lock:
                if key in cache_manager.cache:
                    cache_manager.remove(key)
                    return True
                else:
                    return False
                    
        except Exception as e:
            self.logger.error(f"캐시 키 무효화 중 오류: {str(e)}")
            return False
    
    def invalidate_cache_by_pattern(self, pattern: str) -> int:
        """
        패턴과 일치하는 캐시 키를 무효화합니다.
        
        Args:
            pattern: 캐시 키 패턴
            
        Returns:
            int: 삭제된 항목 수
        """
        try:
            # 캐시 매니저 획득
            cache_manager = self._cache_manager
            
            # 정규 표현식 컴파일
            regex = re.compile(pattern)
            
            # 삭제할 키 목록
            keys_to_remove = []
            
            # 캐시 항목 순회
            with cache_manager._lock:
                for key in cache_manager.cache.keys():
                    if regex.search(key):
                        keys_to_remove.append(key)
            
            # 항목 삭제
            for key in keys_to_remove:
                cache_manager.remove(key)
                
            return len(keys_to_remove)
            
        except Exception as e:
            self.logger.error(f"패턴 기반 캐시 무효화 중 오류: {str(e)}")
            return 0
    
    def _get_cache_item_type(self, key: str) -> str:
        """
        캐시 키 패턴에 따라 항목 유형을 결정합니다.
        
        Args:
            key: 캐시 키
            
        Returns:
            str: 항목 유형
        """
        patterns = [
            (r":status", "상태"),
            (r":branches", "브랜치"),
            (r":tags", "태그"),
            (r":commit:", "커밋"),
            (r":commit_history", "커밋 이력"),
            (r":file_history", "파일 이력"),
            (r":file_contributors", "파일 기여자"),
        ]
        
        for pattern, item_type in patterns:
            if re.search(pattern, key):
                return item_type
                
        return "기타"
    
    def enable_disk_cache(self, enabled: bool = True, directory: Optional[str] = None) -> bool:
        """
        디스크 캐시를 활성화/비활성화합니다.
        
        Args:
            enabled: 활성화 여부
            directory: 캐시 디렉토리 경로
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 캐시 매니저 획득
            cache_manager = self._cache_manager
            
            # 디스크 캐시 설정
            cache_manager.enable_disk_cache = enabled
            
            # 디렉토리 설정
            if directory:
                if not os.path.exists(directory):
                    os.makedirs(directory, exist_ok=True)
                    
                cache_manager.cache_dir = directory
                
            return True
            
        except Exception as e:
            self.logger.error(f"디스크 캐시 설정 중 오류: {str(e)}")
            return False
    
    def save_cache_to_disk(self, directory: Optional[str] = None) -> bool:
        """
        현재 캐시를 디스크에 저장합니다.
        
        Args:
            directory: 저장할 디렉토리 경로
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 디렉토리 설정
            if directory:
                # 디렉토리 생성
                os.makedirs(directory, exist_ok=True)
                
                # 캐시 매니저 획득 및 디렉토리 설정
                self._cache_manager.cache_dir = directory
            
            # 캐시 저장
            for key, item in self._cache_manager.cache.items():
                # 저장소 관련 캐시만 저장
                if self._repo_id in key:
                    try:
                        self._cache_manager._save_to_disk(key, item.data)
                    except Exception as e:
                        self.logger.debug(f"항목 '{key}' 저장 중 오류: {str(e)}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"캐시 저장 중 오류: {str(e)}")
            return False 