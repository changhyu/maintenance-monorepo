"""
캐시 정책 최적화 모듈

사용 패턴 분석을 통해 캐시 TTL 및 캐시 레벨을 자동으로 최적화합니다.
"""

import asyncio
import logging
import time
import json
import os
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
import statistics
from pathlib import Path

from .cache.config import get_cache_config
from .cache.manager import get_cache_manager
from .cache_decorators import CacheLevel
from .metrics_collector import metrics_collector

logger = logging.getLogger(__name__)
config = get_cache_config()
cache = get_cache_manager()

# 싱글톤 인스턴스
_cache_optimizer_instance = None

class CacheUsageData:
    """캐시 키에 대한 사용 데이터"""

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

    @property
    def hit_rate(self) -> float:
        """캐시 적중률"""
        total = self.access_count
        return self.access_count / total if total > 0 else 0
    
    @property
    def avg_hit_time(self) -> float:
        """평균 캐시 적중 시간"""
        return statistics.mean(self.access_history) if self.access_history else 0
    
    @property
    def avg_miss_time(self) -> float:
        """평균 캐시 미스 시간"""
        return statistics.mean(self.miss_history) if self.miss_history else 0
    
    @property
    def performance_gain(self) -> float:
        """캐시로 인한 성능 향상 (%)"""
        if not self.miss_history or not self.access_history:
            return 0
        return ((self.avg_miss_time - self.avg_hit_time) / self.avg_miss_time) * 100
    
    @property
    def age(self) -> float:
        """캐시 키 수명 (초)"""
        return time.time() - self.last_hit_at if self.last_hit_at else 0
    
    @property
    def idle_time(self) -> float:
        """마지막 접근 이후 경과 시간 (초)"""
        return time.time() - self.last_hit_at if self.last_hit_at else 0
    
    @property
    def hourly_pattern(self) -> Dict[int, float]:
        """시간별 접근 패턴 (0-23시)"""
        result = {hour: 0 for hour in range(24)}
        total = sum(self.access_history)
        
        if total > 0:
            for hour, count in enumerate(self.access_history):
                result[hour] = count / total
        
        return result
    
    def record_access(self, hit: bool, response_time: float, size: int = 0) -> None:
        """접근 기록 추가"""
        now = time.time()
        self.last_hit_at = now if hit else self.last_miss_at
        
        if hit:
            self.access_history.append(response_time)
        else:
            self.miss_history.append(response_time)
            if size > 0:
                self.avg_value_size = size
        
        # 타임스탬프 기록
        self.ttl_history.append((now, 3600))  # 기본 TTL 값 사용
        self.level_history.append((now, "MEDIUM"))  # 기본 캐시 레벨 사용
    
    def record_update(self) -> None:
        """캐시 업데이트 기록"""
        self.access_count += 1
        self.miss_count += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """사용 데이터를 사전 형태로 변환합니다."""
        return {
            "access_history": self.access_history,
            "miss_history": self.miss_history,
            "last_hit_at": self.last_hit_at,
            "last_miss_at": self.last_miss_at,
            "ttl_history": self.ttl_history,
            "level_history": self.level_history,
            "avg_value_size": self.avg_value_size,
            "access_count": self.access_count,
            "miss_count": self.miss_count
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheUsageData':
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
        return usage

class CacheOptimizer:
    """캐시 정책 최적화 클래스"""
    
    def __init__(self, data_dir: str = "data/cache_usage"):
        self.usage_data: Dict[str, CacheUsageData] = {}
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.last_optimization = datetime.now() - timedelta(days=1)  # 처음 실행 시 최적화 작업이 가능하도록 설정
        self._optimization_task = None
        self._usage_data_save_task = None
        
        self.optimized_ttls: Dict[str, int] = {}
        self.optimized_levels: Dict[str, str] = {}
        
        self.last_save_time = time.time()
        self.last_optimization_time = time.time()
        self._lock = asyncio.Lock()
        self._initialized = False
    
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
        """정기 작업 스케줄링"""
        while True:
            # 사용 데이터 저장
            if time.time() - self.last_save_time >= self.save_interval:
                await self.save_usage_data()
                self.last_save_time = time.time()
            
            # 최적화 실행
            if time.time() - self.last_optimization_time >= self.optimization_interval:
                await self.optimize_cache_policies()
                self.last_optimization_time = time.time()
            
            # 오래된 키 정리
            await self.cleanup_old_keys()
            
            # 5분마다 작업 체크
            await asyncio.sleep(300)
    
    async def load_usage_data(self) -> None:
        """저장된 캐시 사용 데이터를 로드합니다."""
        try:
            usage_file = os.path.join(self.data_dir, "cache_usage.json")
            if os.path.exists(usage_file):
                logger.info(f"캐시 사용 데이터를 로드합니다: {usage_file}")
                with open(usage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                for key, entry in data.items():
                    usage_data = CacheUsageData.from_dict(entry)
                    self.usage_data[key] = usage_data
                
                logger.info(f"{len(self.usage_data)} 개의 캐시 항목 데이터를 로드했습니다.")
            else:
                logger.info("저장된 캐시 사용 데이터가 없습니다. 새로운 데이터 수집을 시작합니다.")
        except Exception as e:
            logger.error(f"캐시 데이터 로드 중 오류 발생: {str(e)}")
    
    async def save_usage_data(self) -> None:
        """캐시 사용 데이터를 파일에 저장합니다."""
        try:
            usage_file = os.path.join(self.data_dir, "cache_usage.json")
            data = {k: v.to_dict() for k, v in self.usage_data.items()}
            
            with open(usage_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"캐시 사용 데이터를 저장했습니다: {usage_file}")
        except Exception as e:
            logger.error(f"캐시 데이터 저장 중 오류 발생: {str(e)}")
    
    async def _periodic_save_usage_data(self) -> None:
        """주기적으로 캐시 사용 데이터를 저장하는 백그라운드 작업"""
        while True:
            await asyncio.sleep(300)  # 5분마다 저장
            await self.save_usage_data()
    
    async def _periodic_optimization(self) -> None:
        """주기적으로 캐시 최적화를 수행하는 백그라운드 작업"""
        while True:
            await asyncio.sleep(3600)  # 1시간마다 최적화
            await self._optimize_all_caches()
            self.last_optimization = datetime.now()
    
    async def _optimize_all_caches(self) -> None:
        """모든 캐시 항목에 대한 최적화를 수행합니다."""
        try:
            logger.info("전체 캐시 최적화 작업을 시작합니다...")
            optimized_count = 0
            
            for cache_key, usage in self.usage_data.items():
                if len(usage.access_history) > 5:  # 충분한 사용 데이터가 있는 경우만 최적화
                    ttl = await self.get_optimal_ttl(cache_key)
                    level = await self.get_optimal_cache_level(cache_key)
                    optimized_count += 1
            
            logger.info(f"캐시 최적화 완료: {optimized_count}개 항목 최적화됨")
        except Exception as e:
            logger.error(f"캐시 최적화 중 오류 발생: {str(e)}")
    
    def schedule_optimization_tasks(self) -> None:
        """최적화 및 데이터 저장 작업을 스케줄링합니다."""
        if self._optimization_task is None:
            self._optimization_task = asyncio.create_task(self._periodic_optimization())
            logger.info("주기적 캐시 최적화 작업이 스케줄링되었습니다.")
        
        if self._usage_data_save_task is None:
            self._usage_data_save_task = asyncio.create_task(self._periodic_save_usage_data())
            logger.info("주기적 사용 데이터 저장 작업이 스케줄링되었습니다.")
    
    async def record_cache_access(
        self, 
        key: str, 
        hit: bool, 
        response_time: float, 
        size: int = 0
    ) -> None:
        """캐시 접근 기록"""
        async with self._lock:
            # 최대 키 수 제한 확인
            if key not in self.usage_data and len(self.usage_data) >= self.max_kept_keys:
                # 가장 오래된 접근 키 제거
                oldest_key = min(self.usage_data.items(), key=lambda x: x[1].last_hit_at)[0]
                del self.usage_data[oldest_key]
            
            # 키가 없으면 새로 생성
            if key not in self.usage_data:
                self.usage_data[key] = CacheUsageData()
            
            # 접근 기록
            self.usage_data[key].record_access(hit, response_time, size)
    
    async def record_cache_update(self, key: str) -> None:
        """캐시 업데이트 기록"""
        async with self._lock:
            if key in self.usage_data:
                self.usage_data[key].record_update()
    
    async def get_optimal_ttl(self, key: str, default_ttl: int) -> int:
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
    
    async def get_optimal_cache_level(self, key: str, default_level: str = CacheLevel.MEDIUM) -> str:
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
        """캐시 정책 최적화"""
        async with self._lock:
            # 충분한 데이터가 있는지 확인
            total_accesses = sum(usage.access_count for usage in self.usage_data.values())
            if total_accesses < self.min_data_points:
                logger.info(f"최적화를 위한 충분한 데이터가 없습니다. (현재: {total_accesses}, 필요: {self.min_data_points})")
                return
            
            # 접두사별 통계 수집
            prefix_stats: Dict[str, List[CacheUsageData]] = {}
            for key, usage in self.usage_data.items():
                prefix = key.split(":")[0] if ":" in key else key
                if prefix not in prefix_stats:
                    prefix_stats[prefix] = []
                prefix_stats[prefix].append(usage)
            
            # 접두사별로 최적화
            for prefix, usages in prefix_stats.items():
                if not usages:
                    continue
                
                # 접두사에 대한 통계 계산
                hit_rates = [u.hit_rate for u in usages if u.access_count > 10]
                if not hit_rates:
                    continue
                
                avg_hit_rate = statistics.mean(hit_rates)
                performance_gains = [u.performance_gain for u in usages if u.performance_gain > 0]
                avg_performance_gain = statistics.mean(performance_gains) if performance_gains else 0
                
                # 최적화된 TTL 결정
                if avg_hit_rate > 0.9 and avg_performance_gain > 50:
                    # 높은 적중률과 성능 향상: TTL 증가
                    new_ttl = config.api_cache_ttl * 2
                    self.optimized_ttls[f"{prefix}:*"] = new_ttl
                    logger.info(f"접두사 '{prefix}'의 TTL을 {new_ttl}초로 최적화했습니다. "
                               f"(적중률: {avg_hit_rate:.2f}, 성능 향상: {avg_performance_gain:.2f}%)")
                elif avg_hit_rate < 0.3:
                    # 낮은 적중률: TTL 감소
                    new_ttl = max(60, config.api_cache_ttl // 2)
                    self.optimized_ttls[f"{prefix}:*"] = new_ttl
                    logger.info(f"접두사 '{prefix}'의 TTL을 {new_ttl}초로 감소시켰습니다. "
                               f"(적중률: {avg_hit_rate:.2f})")
                
                # 최적화된 캐시 레벨 결정
                hourly_patterns = [u.hourly_pattern for u in usages if u.access_count > 20]
                if hourly_patterns:
                    # 시간별 접근 패턴의 표준 편차 계산
                    pattern_variance = 0
                    for pattern in hourly_patterns:
                        values = list(pattern.values())
                        if values:
                            pattern_variance += statistics.stdev(values) if len(values) > 1 else 0
                    
                    pattern_variance /= len(hourly_patterns)
                    
                    if pattern_variance < 0.05 and avg_hit_rate > 0.8:
                        # 안정적인 패턴과 높은 적중률: HIGH 레벨
                        self.optimized_levels[f"{prefix}:*"] = CacheLevel.HIGH
                        logger.info(f"접두사 '{prefix}'의 캐시 레벨을 HIGH로 최적화했습니다.")
                    elif pattern_variance > 0.2 or avg_hit_rate < 0.4:
                        # 변동이 큰 패턴이나 낮은 적중률: LOW 레벨
                        self.optimized_levels[f"{prefix}:*"] = CacheLevel.LOW
                        logger.info(f"접두사 '{prefix}'의 캐시 레벨을 LOW로 최적화했습니다.")
                    else:
                        # 기본: MEDIUM 레벨
                        self.optimized_levels[f"{prefix}:*"] = CacheLevel.MEDIUM
            
            # 가장 자주 접근하는 개별 키에 대한 최적화
            top_keys = sorted(
                self.usage_data.items(),
                key=lambda x: x[1].access_count,
                reverse=True
            )[:100]  # 상위 100개 키
            
            for key, usage in top_keys:
                if usage.access_count < 50:
                    continue
                
                # 개별 키에 대한 최적화
                if usage.hit_rate > 0.95 and usage.performance_gain > 70:
                    # 매우 높은 적중률과 성능 향상: 더 긴 TTL
                    self.optimized_ttls[key] = config.api_cache_ttl * 3
                    self.optimized_levels[key] = CacheLevel.HIGH
                    logger.info(f"자주 사용되는 키 '{key}'에 대해 특별 최적화를 적용했습니다. "
                               f"(TTL: {self.optimized_ttls[key]}초, 레벨: HIGH)")
            
            logger.info(f"캐시 정책 최적화 완료: {len(self.optimized_ttls)}개의 TTL, "
                       f"{len(self.optimized_levels)}개의 캐시 레벨이 최적화되었습니다.")
    
    async def cleanup_old_keys(self) -> None:
        """오래된 키 정리"""
        async with self._lock:
            # 1주일 이상 접근되지 않은 키 제거
            now = time.time()
            week_ago = now - 7 * 24 * 60 * 60
            
            keys_to_remove = [
                key for key, usage in self.usage_data.items()
                if usage.last_hit_at < week_ago
            ]
            
            for key in keys_to_remove:
                del self.usage_data[key]
            
            if keys_to_remove:
                logger.info(f"{len(keys_to_remove)}개의 오래된 사용 데이터를 정리했습니다.")
    
    async def get_statistics(self) -> Dict[str, Any]:
        """캐시 최적화 통계 조회"""
        async with self._lock:
            usage_stats = {}
            total_hits = 0
            total_misses = 0
            
            # 접두사별 통계
            prefix_stats = {}
            for key, usage in self.usage_data.items():
                total_hits += usage.access_count
                total_misses += usage.miss_count
                
                prefix = key.split(":")[0] if ":" in key else key
                if prefix not in prefix_stats:
                    prefix_stats[prefix] = {"keys": 0, "hits": 0, "misses": 0}
                
                prefix_stats[prefix]["keys"] += 1
                prefix_stats[prefix]["hits"] += usage.access_count
                prefix_stats[prefix]["misses"] += usage.miss_count
            
            # 접두사별 적중률 계산
            for prefix, stats in prefix_stats.items():
                total = stats["hits"] + stats["misses"]
                stats["hit_rate"] = stats["hits"] / total if total > 0 else 0
            
            # 결과 집계
            total = total_hits + total_misses
            usage_stats = {
                "total_keys": len(self.usage_data),
                "total_accesses": total,
                "total_hits": total_hits,
                "total_misses": total_misses,
                "overall_hit_rate": total_hits / total if total > 0 else 0,
                "optimized_ttls": len(self.optimized_ttls),
                "optimized_levels": len(self.optimized_levels),
                "prefix_stats": prefix_stats,
                "top_accessed_keys": [
                    {
                        "key": key,
                        "access_count": usage.access_count,
                        "hit_rate": usage.hit_rate,
                        "performance_gain": usage.performance_gain
                    }
                    for key, usage in sorted(
                        self.usage_data.items(),
                        key=lambda x: x[1].access_count,
                        reverse=True
                    )[:10]  # 상위 10개
                ]
            }
            
            return usage_stats

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
        await _cache_optimizer_instance.load_usage_data()
        
        # 최적화 작업 스케줄링 (주기적으로 실행)
        _cache_optimizer_instance.schedule_optimization_tasks()
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
    key_func=None, 
    fallback_ttl: int = None,
    fallback_level: str = CacheLevel.MEDIUM
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
            cache_key = key_func(*args, **kwargs) if key_func else f"{func.__module__}.{func.__name__}"
            
            # 최적화된 TTL 및 레벨 가져오기
            ttl = await get_cache_optimizer().get_optimal_ttl(cache_key, fallback_ttl or config.api_cache_ttl)
            level = await get_cache_optimizer().get_optimal_cache_level(cache_key, fallback_level)
            
            # 캐시에서 결과 확인
            start_time = time.time()
            cached_result = await cache.get(cache_key)
            
            if cached_result is not None:
                # 캐시 적중
                response_time = time.time() - start_time
                await get_cache_optimizer().record_cache_access(
                    cache_key, hit=True, response_time=response_time
                )
                return cached_result
            
            # 캐시 미스: 원본 함수 실행
            start_time = time.time()
            result = await func(*args, **kwargs)
            response_time = time.time() - start_time
            
            # 결과 캐싱 및 사용 데이터 기록
            content_size = len(str(result)) if result else 0
            await cache.set(cache_key, result, expire=ttl)
            await get_cache_optimizer().record_cache_access(
                cache_key, hit=False, response_time=response_time, size=content_size
            )
            await get_cache_optimizer().record_cache_update(cache_key)
            
            return result
        
        return wrapper
    
    return decorator 