"""
캐시 정책 최적화 모듈
사용 패턴 분석을 통해 캐시 TTL 및 캐시 레벨을 자동으로 최적화합니다.
"""
import asyncio
import json
import logging
import os
import statistics
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import concurrent.futures
# lru_dict 모듈 대신 OrderedDict 사용
from collections import OrderedDict

# 임포트 경로 수정
from core.cache.config import get_cache_config
from core.cache.manager import get_cache_manager
from core.cache_decorators import CacheLevel  # 수정된 임포트 경로
from core.metrics_collector import metrics_collector

logger = logging.getLogger(__name__)
config = get_cache_config()
cache = get_cache_manager()

# 싱글톤 인스턴스
_cache_optimizer_instance = None

# 성능 최적화를 위한 설정
MAX_KEYS = 10000
SAVE_INTERVAL = 300  # 5분
OPTIMIZATION_INTERVAL = 1800  # 30분
MIN_DATA_POINTS = 1000
DEFAULT_TTL = 3600  # 1시간
MEMORY_THRESHOLD = 0.8  # 80% 메모리 임계값

# OrderedDict를 사용하여 LRU 캐시 구현
class LRUCache:
    """OrderedDict를 사용한 LRU 캐시 구현"""
    def __init__(self, max_size):
        self.cache = OrderedDict()
        self.max_size = max_size
        
    def __setitem__(self, key, value):
        if key in self.cache:
            self.cache.pop(key)
        self.cache[key] = value
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)  # FIFO로 제거
            
    def __getitem__(self, key):
        if key in self.cache:
            value = self.cache.pop(key)
            self.cache[key] = value  # 최근 사용 항목으로 이동
            return value
        raise KeyError(key)
        
    def __contains__(self, key):
        return key in self.cache
        
    def __len__(self):
        return len(self.cache)
        
    def items(self):
        return self.cache.items()
    
    def keys(self):
        return self.cache.keys()
        
    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default


class CacheUsageData:
    """캐시 키에 대한 사용 데이터"""
    __slots__ = (
        'access_history', 'miss_history', 'last_hit_at', 'last_miss_at',
        'ttl_history', 'level_history', 'avg_value_size', 'access_count', 
        'miss_count', 'pattern_score'
    )
    
    def __init__(self):
        self.access_history: List[float] = []
        self.miss_history: List[float] = []
        self.last_hit_at: Optional[float] = None
        self.last_miss_at: Optional[float] = None
        self.ttl_history: List[Tuple[float, int]] = []  # (timestamp, ttl)
        self.level_history: List[Tuple[float, str]] = []  # (timestamp, level)
        self.avg_value_size: Optional[int] = None
        self.access_count: int = 0
        self.miss_count: int = 0
        self.pattern_score: float = 0.0

    @property
    def hit_rate(self) -> float:
        """캐시 적중률"""
        total = self.access_count
        if total == 0:
            return 0
        return (self.access_count - self.miss_count) / total

    @property
    def avg_hit_time(self) -> float:
        """평균 캐시 적중 시간"""
        if not self.access_history:
            return 0
        # 모든 데이터를 사용하지 않고 최근 100개만 사용하여 성능 향상
        recent_history = self.access_history[-100:] if len(self.access_history) > 100 else self.access_history
        return sum(recent_history) / len(recent_history)

    @property
    def avg_miss_time(self) -> float:
        """평균 캐시 미스 시간"""
        if not self.miss_history:
            return 0
        # 모든 데이터를 사용하지 않고 최근 100개만 사용하여 성능 향상
        recent_history = self.miss_history[-100:] if len(self.miss_history) > 100 else self.miss_history
        return sum(recent_history) / len(recent_history)

    @property
    def performance_gain(self) -> float:
        """캐시로 인한 성능 향상 (%)"""
        if not self.miss_history or not self.access_history:
            return 0
        miss_time = self.avg_miss_time
        hit_time = self.avg_hit_time
        if miss_time <= 0:
            return 0
        return ((miss_time - hit_time) / miss_time) * 100

    @property
    def age(self) -> float:
        """캐시 키 수명 (초)"""
        return time.time() - self.last_hit_at if self.last_hit_at else 0

    @property
    def idle_time(self) -> float:
        """마지막 접근 이후 경과 시간 (초)"""
        return time.time() - self.last_hit_at if self.last_hit_at else 0

    def hourly_pattern(self) -> Dict[int, float]:
        """시간별 접근 패턴 (0-23시) - 계산 지연 방식으로 변경"""
        if not hasattr(self, '_hourly_pattern_cache') or not self._hourly_pattern_cache:
            result = {hour: 0 for hour in range(24)}
            if self.access_history:
                # 시간별 접근 패턴을 마지막 100개 접근으로 제한하여 성능 향상
                recent_history = self.access_history[-100:] if len(self.access_history) > 100 else self.access_history
                for timestamp in recent_history:
                    hour = datetime.fromtimestamp(timestamp).hour
                    result[hour] += 1
                # 정규화
                total = sum(result.values())
                if total > 0:
                    for hour in result:
                        result[hour] /= total
            setattr(self, '_hourly_pattern_cache', result)
        return getattr(self, '_hourly_pattern_cache')

    def record_access(self, hit: bool, response_time: float, size: int = 0) -> None:
        """접근 기록 추가 - 최적화 버전"""
        now = time.time()
        
        # 접근 횟수 증가
        self.access_count += 1
        
        if hit:
            self.last_hit_at = now
            # 성능을 위해 최대 1000개의 기록만 유지
            if len(self.access_history) >= 1000:
                self.access_history = self.access_history[-900:]
            self.access_history.append(response_time)
        else:
            self.last_miss_at = now
            self.miss_count += 1
            # 성능을 위해 최대 1000개의 기록만 유지
            if len(self.miss_history) >= 1000:
                self.miss_history = self.miss_history[-900:]
            self.miss_history.append(response_time)
            
            # 값 크기 업데이트 (이동 평균 사용)
            if size > 0:
                if self.avg_value_size is None:
                    self.avg_value_size = size
                else:
                    # 이동 평균으로 크기 업데이트
                    self.avg_value_size = (self.avg_value_size * 0.9) + (size * 0.1)
        
        # 캐시 무효화
        if hasattr(self, '_hourly_pattern_cache'):
            delattr(self, '_hourly_pattern_cache')

    def record_update(self) -> None:
        """캐시 업데이트 기록"""
        self.miss_count += 1

    def to_dict(self) -> Dict[str, Any]:
        """사용 데이터를 사전 형태로 변환합니다."""
        # 데이터 크기 축소를 위해 최대 100개의 기록만 저장
        return {
            "access_history": self.access_history[-100:] if len(self.access_history) > 100 else self.access_history,
            "miss_history": self.miss_history[-100:] if len(self.miss_history) > 100 else self.miss_history,
            "last_hit_at": self.last_hit_at,
            "last_miss_at": self.last_miss_at,
            "ttl_history": self.ttl_history[-20:] if len(self.ttl_history) > 20 else self.ttl_history,
            "level_history": self.level_history[-20:] if len(self.level_history) > 20 else self.level_history,
            "avg_value_size": self.avg_value_size,
            "access_count": self.access_count,
            "miss_count": self.miss_count,
            "pattern_score": self.pattern_score,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CacheUsageData":
        """사전에서 사용 데이터 객체를 생성합니다."""
        usage = cls()
        usage.access_history = data.get("access_history", [])
        usage.miss_history = data.get("miss_history", [])
        usage.last_hit_at = data.get("last_hit_at")
        usage.last_miss_at = data.get("last_miss_at")
        usage.ttl_history = data.get("ttl_history", [])
        usage.level_history = data.get("level_history", [])
        usage.avg_value_size = data.get("avg_value_size")
        usage.access_count = data.get("access_count", 0)
        usage.miss_count = data.get("miss_count", 0)
        usage.pattern_score = data.get("pattern_score", 0.0)
        return usage


class CacheOptimizer:
    """캐시 정책 최적화 클래스"""

    def __init__(self, data_dir: str = "data/cache_usage"):
        # LRU 캐시 구현으로 변경
        self.usage_data = LRUCache(MAX_KEYS)
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.last_optimization = datetime.now() - timedelta(days=1)
        
        # 최적화된 설정 값 (LRU 캐시 사용)
        self.optimized_ttls = LRUCache(5000)
        self.optimized_levels = LRUCache(5000)
        
        self.last_save_time = time.time()
        self.last_optimization_time = time.time()
        self.last_cleanup_time = time.time()
        
        self._lock = asyncio.Lock()
        self._initialized = False
        
        self.save_interval = SAVE_INTERVAL
        self.optimization_interval = OPTIMIZATION_INTERVAL
        self.min_data_points = MIN_DATA_POINTS
        self.max_kept_keys = MAX_KEYS

    async def initialize(self) -> None:
        """초기화: 사용 데이터 로드 및 작업 시작"""
        if self._initialized:
            return
            
        # 사용 데이터 로드
        await self.load_usage_data()
        
        # 정기 작업 스케줄링
        asyncio.create_task(self._schedule_tasks())
        self._initialized = True
        logger.info("캐시 최적화 시스템이 초기화되었습니다.")

    async def _schedule_tasks(self) -> None:
        """정기 작업 스케줄링 - 최적화된 버전"""
        while True:
            try:
                now = time.time()
                tasks = []
                
                # 작업 스케줄링
                if now - self.last_save_time >= self.save_interval:
                    tasks.append(self.save_usage_data())
                    self.last_save_time = now
                    
                if now - self.last_optimization_time >= self.optimization_interval:
                    tasks.append(self.optimize_cache_policies())
                    self.last_optimization_time = now
                    
                if now - self.last_cleanup_time >= 3600:  # 1시간마다 정리
                    tasks.append(self.cleanup_old_keys())
                    self.last_cleanup_time = now
                
                # 필요한 작업들만 병렬 실행
                if tasks:
                    await asyncio.gather(*tasks)
                
                # 다음 체크까지 대기
                await asyncio.sleep(60)  # 1분마다 체크
                
            except Exception as e:
                logger.error(f"스케줄링 작업 중 오류 발생: {str(e)}")
                await asyncio.sleep(300)  # 오류 발생 시 5분 후 재시도

    async def load_usage_data(self) -> None:
        """저장된 캐시 사용 데이터를 로드합니다."""
        try:
            usage_file = os.path.join(self.data_dir, "cache_usage.json")
            if os.path.exists(usage_file):
                logger.info(f"캐시 사용 데이터를 로드합니다: {usage_file}")
                
                # 대용량 파일을 효율적으로 로드
                with open(usage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # 가장 자주 사용되는 키를 먼저 처리하도록 정렬
                sorted_items = sorted(
                    data.items(), 
                    key=lambda x: x[1].get("access_count", 0), 
                    reverse=True
                )
                
                # LRU 딕셔너리 제한으로 인한 경고 방지
                count = 0
                for key, entry in sorted_items:
                    if count >= MAX_KEYS:
                        break
                    usage_data = CacheUsageData.from_dict(entry)
                    self.usage_data[key] = usage_data
                    count += 1
                    
                logger.info(f"{len(self.usage_data)} 개의 캐시 항목 데이터를 로드했습니다.")
            else:
                logger.info("저장된 캐시 사용 데이터가 없습니다. 새로운 데이터 수집을 시작합니다.")
        except Exception as e:
            logger.error(f"캐시 데이터 로드 중 오류 발생: {str(e)}")

    async def save_usage_data(self) -> None:
        """캐시 사용 데이터를 파일에 저장합니다."""
        try:
            usage_file = os.path.join(self.data_dir, "cache_usage.json")
            backup_file = os.path.join(self.data_dir, "cache_usage.json.bak")
            
            # 기존 파일 백업
            if os.path.exists(usage_file):
                os.rename(usage_file, backup_file)
            
            # 메모리에서 딕셔너리로 변환
            async with self._lock:
                data = {k: v.to_dict() for k, v in self.usage_data.items()}
            
            # 비동기 쓰기 (ThreadPoolExecutor 사용)
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as pool:
                await loop.run_in_executor(
                    pool, 
                    lambda: self._write_json_file(usage_file, data)
                )
                
            logger.info(f"캐시 사용 데이터를 저장했습니다: {usage_file}")
        except Exception as e:
            logger.error(f"캐시 데이터 저장 중 오류 발생: {str(e)}")

    def _write_json_file(self, file_path: str, data: dict) -> None:
        """별도의 스레드에서 JSON 파일 쓰기"""
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)

    async def record_cache_access(
        self, key: str, hit: bool, response_time: float, size: int = 0
    ) -> None:
        """캐시 접근 기록 - 락 최적화"""
        # 빠른 경로: 키가 이미 존재하고 락이 필요하지 않은 경우
        if key in self.usage_data and hit:
            self.usage_data[key].record_access(hit, response_time, size)
            return
            
        # 락이 필요한 느린 경로
        async with self._lock:
            if key not in self.usage_data:
                self.usage_data[key] = CacheUsageData()
            self.usage_data[key].record_access(hit, response_time, size)

    async def record_cache_update(self, key: str) -> None:
        """캐시 업데이트 기록"""
        if key in self.usage_data:
            self.usage_data[key].record_update()

    async def get_optimal_ttl(self, key: str, default_ttl: int = DEFAULT_TTL) -> int:
        """키에 대한 최적의 TTL 반환"""
        prefix = key.split(":")[0] if ":" in key else key
        
        # 키에 대한 직접 최적화 TTL
        if key in self.optimized_ttls:
            return self.optimized_ttls[key]
            
        # 접두사에 대한 최적화 TTL
        if f"{prefix}:*" in self.optimized_ttls:
            return self.optimized_ttls[f"{prefix}:*"]
            
        # 기본값 반환
        return default_ttl

    async def get_optimal_cache_level(
        self, key: str, default_level: str = CacheLevel.MEDIUM
    ) -> str:
        """키에 대한 최적의 캐시 레벨 반환"""
        prefix = key.split(":")[0] if ":" in key else key
        
        # 키에 대한 직접 최적화 레벨
        if key in self.optimized_levels:
            return self.optimized_levels[key]
            
        # 접두사에 대한 최적화 레벨
        if f"{prefix}:*" in self.optimized_levels:
            return self.optimized_levels[f"{prefix}:*"]
            
        # 기본값 반환
        return default_level

    async def optimize_cache_policies(self) -> None:
        """캐시 정책 최적화 - 향상된 성능"""
        async with self._lock:
            # 충분한 데이터가 있는지 확인
            total_accesses = sum(
                usage.access_count for usage in self.usage_data.values()
            )
            
            if total_accesses < self.min_data_points:
                logger.info(
                    f"최적화를 위한 충분한 데이터가 없습니다. (현재: {total_accesses}, 필요: {self.min_data_points})"
                )
                return
                
            # 접두사별 통계 수집 (스레드 풀 실행기 사용)
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                prefix_stats = await loop.run_in_executor(
                    executor, self._compute_prefix_stats
                )
                
            # 접두사별로 최적화
            for prefix, stats in prefix_stats.items():
                if not stats["usages"]:
                    continue
                    
                # 최적화된 TTL 결정
                if stats["avg_hit_rate"] > 0.9 and stats["avg_performance_gain"] > 50:
                    # 높은 적중률과 성능 향상: TTL 증가
                    new_ttl = config.api_cache_ttl * 2
                    self.optimized_ttls[f"{prefix}:*"] = new_ttl
                    logger.info(
                        f"접두사 '{prefix}'의 TTL을 {new_ttl}초로 최적화했습니다. "
                        f"(적중률: {stats['avg_hit_rate']:.2f}, 성능 향상: {stats['avg_performance_gain']:.2f}%)"
                    )
                elif stats["avg_hit_rate"] < 0.3:
                    # 낮은 적중률: TTL 감소
                    new_ttl = max(60, config.api_cache_ttl // 2)
                    self.optimized_ttls[f"{prefix}:*"] = new_ttl
                    logger.info(
                        f"접두사 '{prefix}'의 TTL을 {new_ttl}초로 감소시켰습니다. "
                        f"(적중률: {stats['avg_hit_rate']:.2f})"
                    )
                    
                # 최적화된 캐시 레벨 결정
                if stats["pattern_variance"] < 0.05 and stats["avg_hit_rate"] > 0.8:
                    # 안정적인 패턴과 높은 적중률: HIGH 레벨
                    self.optimized_levels[f"{prefix}:*"] = CacheLevel.HIGH
                    logger.info(
                        f"접두사 '{prefix}'의 캐시 레벨을 HIGH로 최적화했습니다."
                    )
                elif stats["pattern_variance"] > 0.2 or stats["avg_hit_rate"] < 0.4:
                    # 변동이 큰 패턴이나 낮은 적중률: LOW 레벨
                    self.optimized_levels[f"{prefix}:*"] = CacheLevel.LOW
                    logger.info(
                        f"접두사 '{prefix}'의 캐시 레벨을 LOW로 최적화했습니다."
                    )
                else:
                    # 기본: MEDIUM 레벨
                    self.optimized_levels[f"{prefix}:*"] = CacheLevel.MEDIUM
                    
            # 가장 자주 접근하는 개별 키에 대한 최적화
            await self._optimize_top_keys()
            
            logger.info(
                f"캐시 정책 최적화 완료: {len(self.optimized_ttls)}개의 TTL, "
                f"{len(self.optimized_levels)}개의 캐시 레벨이 최적화되었습니다."
            )
            
            # 최적화 결과 지표 수집
            metrics_collector.gauge(
                "cache_optimizer.optimized_ttls", 
                len(self.optimized_ttls)
            )
            metrics_collector.gauge(
                "cache_optimizer.optimized_levels", 
                len(self.optimized_levels)
            )

    def _compute_prefix_stats(self) -> Dict[str, Dict[str, Any]]:
        """접두사별 통계를 계산 (스레드에서 실행)"""
        prefix_stats = {}
        
        # 자주 사용되는 키에 대해 접두사별로 그룹화
        for key, usage in self.usage_data.items():
            if usage.access_count < 10:
                continue
                
            prefix = key.split(":")[0] if ":" in key else key
            if prefix not in prefix_stats:
                prefix_stats[prefix] = {"usages": [], "hourly_patterns": []}
                
            prefix_stats[prefix]["usages"].append(usage)
            
            if usage.access_count > 20:
                prefix_stats[prefix]["hourly_patterns"].append(usage.hourly_pattern())
                
        # 접두사별 통계 계산
        result = {}
        for prefix, data in prefix_stats.items():
            usages = data["usages"]
            hourly_patterns = data["hourly_patterns"]
            
            if not usages:
                continue
                
            # 접두사에 대한 통계 계산
            hit_rates = [u.hit_rate for u in usages if u.access_count > 10]
            
            if not hit_rates:
                continue
                
            avg_hit_rate = sum(hit_rates) / len(hit_rates)
            
            # 성능 향상 계산
            performance_gains = [
                u.performance_gain for u in usages if u.performance_gain > 0
            ]
            avg_performance_gain = (
                sum(performance_gains) / len(performance_gains) if performance_gains else 0
            )
            
            # 패턴 변동성 계산
            pattern_variance = 0
            if hourly_patterns:
                total_variance = 0
                for pattern in hourly_patterns:
                    values = list(pattern.values())
                    if len(values) > 1:
                        # 표준편차 대신 분산 범위 사용 (계산 효율성)
                        total_variance += max(values) - min(values)
                pattern_variance = total_variance / len(hourly_patterns)
            
            # 결과 저장
            result[prefix] = {
                "usages": usages,
                "avg_hit_rate": avg_hit_rate,
                "avg_performance_gain": avg_performance_gain,
                "pattern_variance": pattern_variance
            }
            
        return result

    async def _optimize_top_keys(self) -> None:
        """자주 사용되는 상위 키에 대한 최적화"""
        # 가장 자주 접근하는 개별 키에 대한 최적화
        top_keys = sorted(
            self.usage_data.items(), key=lambda x: x[1].access_count, reverse=True
        )[:100]  # 상위 100개 키만
        
        for key, usage in top_keys:
            if usage.access_count < 50:
                continue
                
            # 개별 키에 대한 최적화
            if usage.hit_rate > 0.95 and usage.performance_gain > 70:
                # 매우 높은 적중률과 성능 향상: 더 긴 TTL
                self.optimized_ttls[key] = config.api_cache_ttl * 3
                self.optimized_levels[key] = CacheLevel.HIGH
                logger.info(
                    f"자주 사용되는 키 '{key}'에 대해 특별 최적화를 적용했습니다. "
                    f"(TTL: {self.optimized_ttls[key]}초, 레벨: HIGH)"
                )

    async def cleanup_old_keys(self) -> None:
        """오래된 키 정리 - 메모리 효율성 개선"""
        try:
            # 처리 대상 키 선정
            now = time.time()
            week_ago = now - 7 * 24 * 60 * 60
            day_ago = now - 24 * 60 * 60
            
            # LRU 캐시는 자동 정리되므로 최소한으로 작업
            async with self._lock:
                keys_to_remove = []
                # 직접 조회가 아닌 복사본으로 작업
                items = list(self.usage_data.items())
                
                for key, usage in items:
                    # 오래 접근되지 않은 키 또는 거의 사용되지 않는 키 제거
                    if (usage.last_hit_at and usage.last_hit_at < week_ago) or \
                       (usage.access_count < 5 and usage.last_hit_at and usage.last_hit_at < day_ago):
                        keys_to_remove.append(key)
                
                # 제거 작업
                for key in keys_to_remove:
                    if key in self.usage_data:
                        del self.usage_data[key]
                        
                # 최적화된 설정에서 오래된 항목도 정리
                for key in list(self.optimized_ttls.keys()):
                    prefix = key.split(":")[0] if ":" in key else key
                    # 관련 사용 데이터가 없는 경우 제거
                    if not any(k.startswith(prefix) for k in self.usage_data):
                        del self.optimized_ttls[key]
                        
                for key in list(self.optimized_levels.keys()):
                    prefix = key.split(":")[0] if ":" in key else key
                    # 관련 사용 데이터가 없는 경우 제거
                    if not any(k.startswith(prefix) for k in self.usage_data):
                        del self.optimized_levels[key]
            
            if keys_to_remove:
                logger.info(
                    f"{len(keys_to_remove)}개의 오래된 사용 데이터를 정리했습니다."
                )
        except Exception as e:
            logger.error(f"키 정리 중 오류 발생: {str(e)}")

    async def get_statistics(self) -> Dict[str, Any]:
        """캐시 최적화 통계 조회 - 최적화된 버전"""
        try:
            # 데이터 복사본으로 통계 계산하여 락 최소화
            async with self._lock:
                keys_count = len(self.usage_data)
                usages = list(self.usage_data.values())
                optimized_ttls_count = len(self.optimized_ttls)
                optimized_levels_count = len(self.optimized_levels)
                
                # 가장 많이 접근한 키 10개만 샘플링
                top_keys = sorted(
                    self.usage_data.items(),
                    key=lambda x: x[1].access_count,
                    reverse=True,
                )[:10]
            
            # 락 외부에서 계산
            total_hits = sum(usage.access_count for usage in usages)
            total_misses = sum(usage.miss_count for usage in usages)
            total = total_hits + total_misses
            
            # 접두사별 통계 (락 없이 계산)
            prefix_stats = {}
            for key, usage in self.usage_data.items():
                prefix = key.split(":")[0] if ":" in key else key
                if prefix not in prefix_stats:
                    prefix_stats[prefix] = {"keys": 0, "hits": 0, "misses": 0}
                prefix_stats[prefix]["keys"] += 1
                prefix_stats[prefix]["hits"] += usage.access_count
                prefix_stats[prefix]["misses"] += usage.miss_count
            
            # 접두사별 적중률 계산
            for prefix, stats in prefix_stats.items():
                prefix_total = stats["hits"] + stats["misses"]
                stats["hit_rate"] = stats["hits"] / prefix_total if prefix_total > 0 else 0
            
            # 결과 집계
            usage_stats = {
                "total_keys": keys_count,
                "total_accesses": total,
                "total_hits": total_hits,
                "total_misses": total_misses,
                "overall_hit_rate": total_hits / total if total > 0 else 0,
                "optimized_ttls": optimized_ttls_count,
                "optimized_levels": optimized_levels_count,
                "prefix_stats": prefix_stats,
                "top_accessed_keys": [
                    {
                        "key": key[:50] + "..." if len(key) > 50 else key,  # 키 길이 제한
                        "access_count": usage.access_count,
                        "hit_rate": usage.hit_rate,
                        "performance_gain": usage.performance_gain,
                    }
                    for key, usage in top_keys
                ],
                "memory_usage_mb": self._estimate_memory_usage() / (1024 * 1024),
            }
            
            return usage_stats
        except Exception as e:
            logger.error(f"통계 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def _estimate_memory_usage(self) -> float:
        """메모리 사용량 추정 (바이트)"""
        try:
            import sys
            # 샘플링 방식으로 메모리 사용량 추정
            usage_data_size = 0
            sample_keys = list(self.usage_data.keys())[:100]  # 최대 100개 키만 샘플링
            
            if sample_keys:
                sample_size = sum(sys.getsizeof(self.usage_data[key]) for key in sample_keys)
                usage_data_size = (sample_size / len(sample_keys)) * len(self.usage_data)
            
            # 다른 딕셔너리 메모리 사용량 추가
            other_dicts_size = sys.getsizeof(self.optimized_ttls) + sys.getsizeof(self.optimized_levels)
            
            return usage_data_size + other_dicts_size
        except:
            return 0


async def initialize_cache_optimizer() -> CacheOptimizer:
    """캐시 최적화 시스템을 초기화합니다.
    이 함수는 API 서버 시작 시 호출되며, 기존 사용 데이터를 로드하고
    캐시 정책 최적화 작업을 스케줄링합니다.
    Returns:
        CacheOptimizer: 초기화된 캐시 최적화기 인스턴스
    """
    global _cache_optimizer_instance
    if _cache_optimizer_instance is None:
        logger.info("캐시 최적화 시스템을 초기화합니다...")
        data_dir = Path("data/cache_usage")
        os.makedirs(data_dir, exist_ok=True)
        _cache_optimizer_instance = CacheOptimizer(data_dir=str(data_dir))
        await _cache_optimizer_instance.initialize()
        logger.info("캐시 최적화 시스템이 성공적으로 초기화되었습니다.")
    return _cache_optimizer_instance


def get_cache_optimizer() -> CacheOptimizer:
    """현재 캐시 최적화기 인스턴스를 반환합니다.
    Returns:
        CacheOptimizer: 캐시 최적화기 인스턴스 또는 초기화되지 않은 경우 None
    """
    global _cache_optimizer_instance
    return _cache_optimizer_instance


# 데코레이터 함수
def with_optimized_cache(
    key_func=None, fallback_ttl: int = None, fallback_level: str = CacheLevel.MEDIUM
):
    """
    최적화된 캐시 TTL과 레벨을 사용하는 데코레이터
    Args:
        key_func: 캐시 키를 생성하는 함수
        fallback_ttl: 최적화된 TTL이 없을 때 사용할 기본값
        fallback_level: 최적화된 레벨이 없을 때 사용할 기본값
    """
    from functools import wraps

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 키 생성
            cache_key = (
                key_func(*args, **kwargs)
                if key_func
                else f"{func.__module__}.{func.__name__}"
            )
            
            # 최적화된 캐시 처리
            optimizer = get_cache_optimizer()
            if not optimizer:
                # 최적화기가 없는 경우 원본 함수 실행
                return await func(*args, **kwargs)
            
            # 최적화된 TTL 및 레벨 가져오기
            ttl = await optimizer.get_optimal_ttl(
                cache_key, fallback_ttl or config.api_cache_ttl
            )
            level = await optimizer.get_optimal_cache_level(
                cache_key, fallback_level
            )
            
            # 캐시에서 결과 확인
            start_time = time.time()
            cached_result = await cache.get(cache_key)
            
            if cached_result is not None:
                # 캐시 적중
                response_time = time.time() - start_time
                await optimizer.record_cache_access(
                    cache_key, hit=True, response_time=response_time
                )
                metrics_collector.increment("cache.hit")
                return cached_result
                
            # 캐시 미스: 원본 함수 실행
            metrics_collector.increment("cache.miss")
            start_time = time.time()
            result = await func(*args, **kwargs)
            response_time = time.time() - start_time
            
            # 결과 캐싱 및 사용 데이터 기록
            content_size = len(str(result)) if result else 0
            await cache.set(cache_key, result, expire=ttl)
            await optimizer.record_cache_access(
                cache_key, hit=False, response_time=response_time, size=content_size
            )
            await optimizer.record_cache_update(cache_key)
            
            # 성능 지표 기록
            metrics_collector.timing(
                "cache.response_time", 
                response_time * 1000
            )  # 밀리초 단위
            
            return result
            
        return wrapper
    
    return decorator
