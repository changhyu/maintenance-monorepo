"""
GitService를 위한 고급 캐시 관리자

이 모듈은 Git 관련 작업에 대한 효율적인 캐싱 메커니즘을 제공합니다.
적응형 TTL, 메모리 최적화, 디스크 캐싱 등의 기능을 포함합니다.
"""
import collections
import json
import logging
import os
import sys
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import weakref

logger = logging.getLogger(__name__)

class CacheItem:
    """캐시 항목 클래스"""
    
    __slots__ = ('key', 'data', 'created_at', 'last_accessed_at', 
                'access_count', 'ttl', 'size')
    
    def __init__(self, key: str, data: Any, ttl: int = 300):
        self.key = key
        self.data = data
        self.created_at = time.time()
        self.last_accessed_at = self.created_at
        self.access_count = 0
        self.ttl = ttl
        self.size = self._estimate_size(data)
        
    def update(self, data: Any, ttl: Optional[int] = None):
        """데이터 업데이트"""
        self.data = data
        self.last_accessed_at = time.time()
        if ttl is not None:
            self.ttl = ttl
        self.size = self._estimate_size(data)
        
    def access(self):
        """항목 접근 시 호출"""
        self.last_accessed_at = time.time()
        self.access_count += 1
        return self.data
    
    def is_expired(self) -> bool:
        """만료 여부 확인"""
        return (time.time() - self.created_at) > self.ttl
        
    def time_to_expiry(self) -> float:
        """만료까지 남은 시간(초)"""
        expiry_time = self.created_at + self.ttl
        remaining = expiry_time - time.time()
        return max(0, remaining)
    
    def age(self) -> float:
        """항목 수명(초)"""
        return time.time() - self.created_at
    
    def idle_time(self) -> float:
        """마지막 접근 후 경과 시간(초)"""
        return time.time() - self.last_accessed_at
    
    def _estimate_size(self, obj: Any) -> int:
        """객체 메모리 사용량 추정(바이트)"""
        try:
            if obj is None:
                return 8
                
            size = sys.getsizeof(obj)
            
            # 기본 타입은 바로 반환
            if isinstance(obj, (int, float, bool)) or obj is None:
                return size
                
            # 문자열은 길이에 비례
            if isinstance(obj, str):
                return size
                
            # 컨테이너 타입은 재귀적으로 크기 계산
            if isinstance(obj, dict):
                # 딕셔너리 항목 샘플링 (최대 100개 항목만 검사)
                items = list(obj.items())[:100]
                avg_size = sum(self._estimate_size(k) + self._estimate_size(v) for k, v in items) / max(1, len(items))
                return size + int(avg_size * len(obj))
                
            elif isinstance(obj, (list, tuple, set)):
                # 리스트 항목 샘플링 (최대 100개 항목만 검사)
                items = list(obj)[:100]
                if not items:
                    return size
                avg_size = sum(self._estimate_size(item) for item in items) / len(items)
                return size + int(avg_size * len(obj))
                
            return size
        except Exception as e:
            logger.debug(f"크기 계산 중 오류: {e}")
            return max(sys.getsizeof(obj), 1024)  # 최소 1KB로 가정
            
    def to_dict(self) -> Dict[str, Any]:
        """직렬화를 위해 딕셔너리로 변환"""
        return {
            "key": self.key,
            "created_at": self.created_at,
            "last_accessed_at": self.last_accessed_at,
            "access_count": self.access_count,
            "ttl": self.ttl,
            "data": self.data,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheItem':
        """딕셔너리에서 객체 생성"""
        if not isinstance(data, dict) or "key" not in data or "data" not in data:
            raise ValueError("유효하지 않은 캐시 항목 데이터")
            
        item = cls(data["key"], data["data"], data.get("ttl", 300))
        item.created_at = data.get("created_at", time.time())
        item.last_accessed_at = data.get("last_accessed_at", item.created_at)
        item.access_count = data.get("access_count", 0)
        return item

class CacheStats:
    """캐시 통계 수집 클래스"""
    
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.adds = 0
        self.updates = 0
        self.evictions = 0
        self.expirations = 0
        self.memory_limit_triggered = 0
        self.item_limit_triggered = 0
        self.optimize_runs = 0
        self.start_time = time.time()
        self.last_optimize_time = 0
        self.peak_memory_usage = 0
        self.peak_item_count = 0
        
    def hit(self):
        """캐시 적중 기록"""
        self.hits += 1
        
    def miss(self):
        """캐시 미스 기록"""
        self.misses += 1
        
    def add(self):
        """캐시 항목 추가 기록"""
        self.adds += 1
        
    def update(self):
        """캐시 항목 업데이트 기록"""
        self.updates += 1
        
    def evict(self):
        """캐시 항목 제거 기록"""
        self.evictions += 1
        
    def expire(self):
        """캐시 항목 만료 기록"""
        self.expirations += 1
        
    def optimize(self):
        """캐시 최적화 실행 기록"""
        self.optimize_runs += 1
        self.last_optimize_time = time.time()
        
    def memory_limit(self):
        """메모리 제한 도달 기록"""
        self.memory_limit_triggered += 1
        
    def item_limit(self):
        """항목 제한 도달 기록"""
        self.item_limit_triggered += 1
        
    def update_peak_memory(self, memory_usage: int):
        """최대 메모리 사용량 업데이트"""
        self.peak_memory_usage = max(self.peak_memory_usage, memory_usage)
        
    def update_peak_items(self, item_count: int):
        """최대 항목 수 업데이트"""
        self.peak_item_count = max(self.peak_item_count, item_count)
        
    @property
    def hit_ratio(self) -> float:
        """적중률 계산"""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0
        
    @property
    def uptime(self) -> float:
        """캐시 가동 시간(초)"""
        return time.time() - self.start_time
        
    def to_dict(self) -> Dict[str, Any]:
        """통계 정보를 딕셔너리로 변환"""
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": self.hit_ratio,
            "adds": self.adds,
            "updates": self.updates,
            "evictions": self.evictions,
            "expirations": self.expirations,
            "memory_limit_triggered": self.memory_limit_triggered,
            "item_limit_triggered": self.item_limit_triggered,
            "optimize_runs": self.optimize_runs,
            "uptime": self.uptime,
            "peak_memory_usage": self.peak_memory_usage,
            "peak_memory_usage_mb": self.peak_memory_usage / (1024 * 1024),
            "peak_item_count": self.peak_item_count,
            "last_optimize_time": self.last_optimize_time,
        }

class AccessPatternAnalyzer:
    """접근 패턴 분석기"""
    
    def __init__(self, window_size: int = 10):
        self.window_size = window_size
        self.access_patterns = {}  # key -> [timestamps]
        self.interval_stats = {}   # key -> {"avg": float, "stddev": float, ...}
        
    def record_access(self, key: str):
        """항목 접근 기록"""
        now = time.time()
        
        if key not in self.access_patterns:
            self.access_patterns[key] = collections.deque(maxlen=self.window_size)
            
        self.access_patterns[key].append(now)
        
        # 충분한 데이터가 쌓이면 통계 업데이트
        if len(self.access_patterns[key]) >= 3:
            self._update_stats(key)
            
    def _update_stats(self, key: str):
        """접근 간격 통계 업데이트"""
        if key not in self.access_patterns or len(self.access_patterns[key]) < 2:
            return
            
        # 접근 간격 계산
        timestamps = list(self.access_patterns[key])
        intervals = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
        
        if not intervals:
            return
            
        # 통계 계산
        avg_interval = sum(intervals) / len(intervals)
        
        # 표준편차 계산
        variance = sum((x - avg_interval) ** 2 for x in intervals) / len(intervals) if len(intervals) > 1 else 0
        stddev = variance ** 0.5
        
        # 통계 저장
        self.interval_stats[key] = {
            "avg": avg_interval,
            "min": min(intervals),
            "max": max(intervals),
            "stddev": stddev,
            "count": len(intervals),
            "last_update": time.time(),
        }
        
    def get_optimal_ttl(self, key: str, default_ttl: int) -> int:
        """접근 패턴에 기반한 최적의 TTL 계산"""
        if key not in self.interval_stats:
            return default_ttl
            
        stats = self.interval_stats[key]
        avg_interval = stats["avg"]
        
        # 매우 자주 접근되는 항목
        if avg_interval < 10:  # 10초 이하
            return max(300, int(default_ttl * 2))  # 기본값의 2배, 최소 5분
        
        # 자주 접근되는 항목
        if avg_interval < 60:  # 1분 이하
            return int(default_ttl * 1.5)  # 기본값의 1.5배
        
        # 보통 간격으로 접근되는 항목
        if avg_interval < 300:  # 5분 이하
            return default_ttl  # 기본값 유지
        
        # 드물게 접근되는 항목
        if avg_interval < 1800:  # 30분 이하
            return max(60, int(default_ttl * 0.75))  # 기본값의 3/4, 최소 1분
        
        # 매우 드물게 접근되는 항목
        return max(30, int(default_ttl * 0.5))  # 기본값의 1/2, 최소 30초
    
    def analyze_key_importance(self, key: str) -> float:
        """키의 중요도 점수 계산 (0-1 사이, 높을수록 중요)"""
        if key not in self.interval_stats:
            return 0.5  # 기본 중요도
            
        stats = self.interval_stats[key]
        
        # 접근 빈도가 높을수록 중요도 높음
        if stats["avg"] < 10:
            frequency_score = 1.0
        elif stats["avg"] < 60:
            frequency_score = 0.8
        elif stats["avg"] < 300:
            frequency_score = 0.6
        elif stats["avg"] < 1800:
            frequency_score = 0.4
        else:
            frequency_score = 0.2
            
        # 최근성 점수 (마지막 업데이트가 최근일수록 중요)
        recency_factor = max(0, min(1, (time.time() - stats["last_update"]) / 3600))
        recency_score = 1 - recency_factor
        
        # 안정성 점수 (표준편차가 낮을수록 예측 가능하므로 중요)
        if stats["avg"] > 0:
            stability_score = max(0, min(1, 1 - (stats["stddev"] / stats["avg"])))
        else:
            stability_score = 0
            
        # 종합 점수 계산 (가중치 적용 가능)
        return (frequency_score * 0.5) + (recency_score * 0.3) + (stability_score * 0.2)

class CacheManager:
    """고급 캐시 관리자"""
    
    def __init__(self, max_items: int = 5000, max_memory_mb: int = 200, 
                 enable_disk_cache: bool = True, cache_dir: Optional[str] = None,
                 adaptive_ttl: bool = True, default_ttl: int = 300,
                 purge_interval: int = 60):
        self.cache = {}  # 실제 캐시 저장소
        self.lock = Lock()  # 스레드 세이프
        self.max_items = max_items
        self.max_memory = max_memory_mb * 1024 * 1024  # MB -> bytes
        
        # TTL 관련 설정
        self.default_ttl = default_ttl
        self.adaptive_ttl = adaptive_ttl
        self.ttl_config = {
            "status": 5,           # 저장소 상태는 5초
            "branches": 60,         # 브랜치 목록은 60초
            "tags": 60,             # 태그 목록은 60초
            "commit_history": 300,  # 커밋 이력은 300초(5분)
            "file_history": 600,    # 파일 이력은 600초(10분)
            "file_contributors": 600,  # 파일 기여자는 600초(10분)
            "repo_metrics": 1800,   # 저장소 메트릭스는 1800초(30분)
        }
        
        # 최소/최대 TTL 제한
        self.min_ttl = 5    # 최소 5초
        self.max_ttl = 86400  # 최대 1일
        
        # LRU 관련 - OrderedDict로 변경하여 성능 개선
        self.lru_cache = collections.OrderedDict()
        
        # 통계 수집
        self.stats = CacheStats()
        
        # 접근 패턴 분석
        self.analyzer = AccessPatternAnalyzer()
        
        # 디스크 캐시 설정
        self.enable_disk_cache = enable_disk_cache
        if enable_disk_cache:
            self.cache_dir = cache_dir or os.path.join(os.path.expanduser("~"), ".git_cache")
            os.makedirs(self.cache_dir, exist_ok=True)
            
        # 백그라운드 청소 스케줄링
        self.purge_interval = purge_interval
        self._start_purge_thread()
        
        # 메모리 사용량 추적
        self.current_memory_usage = 0
        
    def _start_purge_thread(self):
        """만료된 항목을 주기적으로 제거하는 스레드 시작"""
        def purge_loop():
            while True:
                time.sleep(self.purge_interval)
                try:
                    self.purge_expired()
                    # 주기적으로 최적화도 수행
                    if len(self.cache) > self.max_items * 0.8:  # 80% 이상 차면 최적화
                        self.optimize_cache()
                except Exception as e:
                    logger.error(f"캐시 정리 중 오류 발생: {str(e)}")
        
        thread = threading.Thread(target=purge_loop, daemon=True)
        thread.start()
        
    def get(self, key: str) -> Optional[Any]:
        """캐시에서 값 조회"""
        with self.lock:
            if key not in self.cache:
                self.stats.miss()
                return None
                
            cache_item = self.cache[key]
            
            # 만료 확인
            if cache_item.is_expired():
                self._remove_item(key)
                self.stats.expire()
                self.stats.miss()
                return None
                
            # 접근 기록
            value = cache_item.access()
            self._update_lru(key)  # LRU 업데이트
            self.analyzer.record_access(key)
            self.stats.hit()
            
            return value
            
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """캐시에 값 저장"""
        # None 값은 저장하지 않음
        if value is None:
            return False
            
        with self.lock:
            # TTL 결정
            if ttl is None:
                ttl = self._get_ttl_for_key(key)
                
            # 기존 항목 업데이트
            if key in self.cache:
                old_size = self.cache[key].size
                self.cache[key].update(value, ttl)
                new_size = self.cache[key].size
                
                # 메모리 사용량 조정
                self.current_memory_usage += (new_size - old_size)
                
                self._update_lru(key)
                self.stats.update()
                return True
                
            # 최대 항목 수 확인 및 정리
            if len(self.cache) >= self.max_items:
                self._evict_items()
                if len(self.cache) >= self.max_items:
                    self.stats.item_limit()
                    return False
                    
            # 새 항목 생성
            cache_item = CacheItem(key, value, ttl)
            self.cache[key] = cache_item
            self.current_memory_usage += cache_item.size
            
            # 메모리 제한 확인
            if self.current_memory_usage > self.max_memory:
                freed = self._reduce_memory_usage()
                if freed < 0.1 * self.max_memory:  # 10% 이상 확보 실패
                    self.stats.memory_limit()
                    # 항목은 유지, 경고만 로그
                    logger.warning(f"메모리 제한 도달. 현재: {self.current_memory_usage/(1024*1024):.2f}MB, 최대: {self.max_memory/(1024*1024):.2f}MB")
                    
            # LRU 업데이트
            self._update_lru(key)
            self.stats.add()
            
            # 디스크 캐시 저장
            if self.enable_disk_cache and self._should_persist_to_disk(key, value):
                self._save_to_disk(key, value)
                
            return True
            
    def _update_lru(self, key: str):
        """LRU 큐 업데이트 (OrderedDict 사용)"""
        # 이미 있으면 삭제 후 다시 추가하여 최근 사용으로 표시
        self.lru_cache.pop(key, None)
        self.lru_cache[key] = None
        
    def _evict_items(self, count: int = 1) -> int:
        """LRU 전략으로 항목 제거"""
        evicted = 0
        
        # LRU 캐시에서 가장 오래된 항목부터 제거
        for _ in range(min(count, len(self.lru_cache))):
            if not self.lru_cache:
                break
                
            # 가장 오래된 항목 키 가져오기 (OrderedDict의 첫 번째 항목)
            lru_key = next(iter(self.lru_cache))
            
            if lru_key in self.cache:
                self._remove_item(lru_key)
                evicted += 1
                
        return evicted
        
    def _reduce_memory_usage(self) -> int:
        """메모리 사용량 감소 (반환값: 확보한 바이트)"""
        target = int(0.8 * self.max_memory)  # 목표: 80%로 줄이기
        
        if self.current_memory_usage <= target:
            return 0
            
        freed = 0
        to_free = self.current_memory_usage - target
        
        # LRU 전략으로 메모리 확보
        lru_keys = list(self.lru_cache.keys())
        for key in lru_keys:
            if key in self.cache:
                item_size = self.cache[key].size
                self._remove_item(key)
                freed += item_size
                
                if freed >= to_free:
                    break
                    
        return freed
        
    def _remove_item(self, key: str):
        """캐시에서 항목 제거"""
        if key in self.cache:
            item_size = self.cache[key].size
            del self.cache[key]
            self.lru_cache.pop(key, None)
            self.current_memory_usage -= item_size
            self.stats.evict()
            
    def purge_expired(self) -> int:
        """만료된 항목 정리"""
        with self.lock:
            now = time.time()
            expired_keys = [
                key for key, item in list(self.cache.items())
                if now - item.created_at > item.ttl
            ]
            
            for key in expired_keys:
                self._remove_item(key)
                
            if expired_keys:
                self.stats.expirations += len(expired_keys)
                
            return len(expired_keys)
            
    def optimize_cache(self):
        """캐시 최적화 수행"""
        with self.lock:
            # 가장 중요도가 낮은 항목들 제거
            if len(self.cache) > self.max_items * 0.9:  # 90% 이상 차있으면
                items_to_remove = int(len(self.cache) * 0.2)  # 20% 제거
                
                # 중요도 기준으로 정렬
                items = [(key, self.analyzer.analyze_key_importance(key)) 
                         for key in self.cache.keys()]
                items.sort(key=lambda x: x[1])  # 중요도 낮은 순
                
                # 중요도 낮은 항목들 제거
                for key, _ in items[:items_to_remove]:
                    self._remove_item(key)
                    
            # TTL 최적화
            if self.adaptive_ttl:
                for key in list(self.cache.keys()):
                    if key in self.cache:  # 다시 확인 (다른 스레드에서 제거했을 수 있음)
                        optimal_ttl = self._get_optimal_ttl(key)
                        if optimal_ttl != self.cache[key].ttl:
                            self.cache[key].ttl = optimal_ttl
                            
            self.stats.optimize()
            self.stats.update_peak_memory(self.current_memory_usage)
            self.stats.update_peak_items(len(self.cache))
            
    def clear(self):
        """캐시 전체 삭제"""
        with self.lock:
            self.cache.clear()
            self.lru_cache.clear()
            self.current_memory_usage = 0
            
    def _get_ttl_for_key(self, key: str) -> int:
        """키에 맞는 TTL 결정"""
        # 키 패턴별 TTL 설정
        for pattern, ttl in self.ttl_config.items():
            if pattern in key:
                return ttl
                
        # 적응형 TTL
        if self.adaptive_ttl:
            return self._get_optimal_ttl(key)
            
        return self.default_ttl
        
    def _get_optimal_ttl(self, key: str) -> int:
        """최적의 TTL 계산"""
        base_ttl = self.ttl_config.get(key, self.default_ttl)
        
        if self.adaptive_ttl:
            optimal_ttl = self.analyzer.get_optimal_ttl(key, base_ttl)
            # 최소/최대 제한
            return max(self.min_ttl, min(self.max_ttl, optimal_ttl))
            
        return base_ttl
        
    def _should_persist_to_disk(self, key: str, value: Any) -> bool:
        """디스크에 저장해야 하는지 결정"""
        # 너무 작은 값은 디스크에 저장하지 않음
        if sys.getsizeof(value) < 1024:  # 1KB 미만
            return False
            
        # 중요도가 높은 항목만 디스크에 저장
        importance = self.analyzer.analyze_key_importance(key)
        return importance > 0.7
        
    def _get_disk_path(self, key: str) -> str:
        """디스크 캐시 경로 생성"""
        # 키를 파일 시스템에 적합한 형태로 변환
        import hashlib
        hash_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{hash_key}.cache")
        
    def _save_to_disk(self, key: str, value: Any) -> bool:
        """디스크에 캐시 저장"""
        if not self.enable_disk_cache:
            return False
            
        try:
            path = self._get_disk_path(key)
            with open(path, 'w') as f:
                json.dump({
                    "key": key,
                    "data": value,
                    "timestamp": time.time()
                }, f)
            return True
        except Exception as e:
            logger.error(f"디스크 캐시 저장 실패: {str(e)}")
            return False
            
    def _load_from_disk(self, key: str = None) -> Optional[Any]:
        """디스크에서 캐시 로드
        
        Args:
            key: 로드할 특정 키. None이면 전체 캐시 초기화 시도
        """
        if not self.enable_disk_cache:
            return None
            
        try:
            # key가 None인 경우, 디렉토리 전체를 스캔하여 모든 캐시 항목 로드 시도
            if key is None:
                cache_dir = Path(self.cache_dir)
                if not cache_dir.exists():
                    return None
                    
                loaded = 0
                for cache_file in cache_dir.glob("*.cache"):
                    try:
                        with open(cache_file, 'r') as f:
                            data = json.load(f)
                            
                        # 만료 확인
                        if time.time() - data["timestamp"] > self.max_ttl:
                            os.remove(cache_file)
                            continue
                            
                        # 캐시에 로드
                        self.set(data["key"], data["data"])
                        loaded += 1
                    except Exception as e:
                        logger.debug(f"캐시 파일 로드 실패: {cache_file}, {str(e)}")
                        
                logger.debug(f"디스크 캐시에서 {loaded}개 항목을 로드했습니다.")
                return loaded
            
            # 특정 키에 대한 캐시 항목 로드
            path = self._get_disk_path(key)
            if not os.path.exists(path):
                return None
                
            with open(path, 'r') as f:
                data = json.load(f)
                
            # 만료 확인
            if time.time() - data["timestamp"] > self.max_ttl:
                os.remove(path)
                return None
                
            return data["data"]
        except Exception as e:
            logger.error(f"디스크 캐시 로드 실패: {str(e)}")
            return None
            
    def get_stats(self) -> Dict[str, Any]:
        """캐시 통계 정보"""
        with self.lock:
            stats = self.stats.to_dict()
            stats.update({
                "current_items": len(self.cache),
                "max_items": self.max_items,
                "current_memory_mb": self.current_memory_usage / (1024 * 1024),
                "max_memory_mb": self.max_memory / (1024 * 1024),
                "memory_usage_percent": (self.current_memory_usage / self.max_memory) * 100 if self.max_memory > 0 else 0,
            })
            return stats

# 싱글톤 인스턴스
_cache_manager = None

def get_cache_manager(max_items: int = 5000, max_memory_mb: int = 200, 
                      enable_disk_cache: bool = True, cache_dir: Optional[str] = None,
                      adaptive_ttl: bool = True) -> CacheManager:
    """
    캐시 매니저 인스턴스를 반환
    
    Args:
        max_items: 최대 캐시 항목 수
        max_memory_mb: 최대 캐시 메모리 (MB)
        enable_disk_cache: 디스크 캐시 활성화 여부
        cache_dir: 캐시 디렉토리 경로
        adaptive_ttl: 적응형 TTL 활성화 여부
        
    Returns:
        캐시 매니저 인스턴스
    """
    global _cache_manager
    
    if _cache_manager is None:
        _cache_manager = CacheManager(
            max_items=max_items,
            max_memory_mb=max_memory_mb,
            enable_disk_cache=enable_disk_cache,
            cache_dir=cache_dir,
            adaptive_ttl=adaptive_ttl
        )
        
        # 디스크 캐시 로드 시도
        if enable_disk_cache:
            _cache_manager._load_from_disk()
            
    return _cache_manager