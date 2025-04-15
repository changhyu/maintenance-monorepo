"""
Redis 캐시 관리자 모듈

Redis를 사용한 분산 캐시 구현을 제공합니다.
"""
import asyncio
import gzip
import json
import logging
import time
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import aioredis
from aioredis.client import Redis, Pipeline
from aioredis.exceptions import RedisError, LockError, WatchError

from .constants import (
    COMPRESSION_THRESHOLD,
    DEFAULT_CACHE_TTL,
    MAX_RETRY_ATTEMPTS,
    REDIS_BATCH_SIZE,
    REDIS_DECODE_RESPONSES,
    REDIS_ENCODING,
    REDIS_SOCKET_TIMEOUT,
    RETRY_DELAY
)
from .interfaces import RedisInterface

logger = logging.getLogger(__name__)


class RedisLock:
    """
    Redis 기반 분산 락
    
    데드락 방지와 자동 락 해제를 지원하는 분산 락 구현
    """
    
    def __init__(
        self,
        redis: Redis,
        key: str,
        timeout: int = 10,
        retry_interval: float = 0.1,
        blocking: bool = True
    ):
        """
        Redis 락 초기화
        
        Args:
            redis: Redis 클라이언트
            key: 락 키
            timeout: 락 타임아웃(초)
            retry_interval: 재시도 간격(초)
            blocking: 블로킹 모드 여부
        """
        self.redis = redis
        self.key = f"lock:{key}"
        self.timeout = timeout
        self.retry_interval = retry_interval
        self.blocking = blocking
        self.lock_id = f"{time.time()}.{id(self)}"
        self._locked = False
        
    async def __aenter__(self):
        """컨텍스트 매니저 진입"""
        await self.acquire()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """컨텍스트 매니저 종료"""
        await self.release()
        
    async def acquire(self) -> bool:
        """
        락 획득
        
        Returns:
            획득 성공 여부
        """
        while True:
            # 락 획득 시도
            acquired = await self.redis.set(
                self.key,
                self.lock_id,
                nx=True,
                ex=self.timeout
            )
            
            if acquired:
                self._locked = True
                return True
                
            if not self.blocking:
                return False
                
            # 블로킹 모드면 재시도
            await asyncio.sleep(self.retry_interval)
            
    async def release(self) -> bool:
        """
        락 해제
        
        Returns:
            해제 성공 여부
        """
        if not self._locked:
            return False
            
        # 락 ID 확인 후 해제
        async with self.redis.pipeline() as pipe:
            try:
                await pipe.watch(self.key)
                lock_id = await pipe.get(self.key)
                
                if lock_id == self.lock_id:
                    await pipe.multi()
                    await pipe.delete(self.key)
                    await pipe.execute()
                    self._locked = False
                    return True
                    
                await pipe.unwatch()
                return False
                
            except WatchError:
                return False
                
    async def extend(self, additional_time: int) -> bool:
        """
        락 시간 연장
        
        Args:
            additional_time: 추가 시간(초)
            
        Returns:
            연장 성공 여부
        """
        if not self._locked:
            return False
            
        # 락 ID 확인 후 시간 연장
        async with self.redis.pipeline() as pipe:
            try:
                await pipe.watch(self.key)
                lock_id = await pipe.get(self.key)
                
                if lock_id == self.lock_id:
                    await pipe.multi()
                    await pipe.expire(self.key, additional_time)
                    await pipe.execute()
                    return True
                    
                await pipe.unwatch()
                return False
                
            except WatchError:
                return False


class RedisCacheManager(RedisInterface):
    """
    Redis 캐시 관리자
    
    Redis를 사용한 분산 캐시 구현을 제공합니다.
    """
    
    def __init__(
        self,
        redis_url: str,
        default_ttl: int = DEFAULT_CACHE_TTL,
        encoding: str = REDIS_ENCODING,
        socket_timeout: float = REDIS_SOCKET_TIMEOUT,
        decode_responses: bool = REDIS_DECODE_RESPONSES,
        compression_enabled: bool = True
    ):
        """
        Redis 캐시 관리자 초기화
        
        Args:
            redis_url: Redis 연결 URL
            default_ttl: 기본 TTL(초)
            encoding: 인코딩 방식
            socket_timeout: 소켓 타임아웃(초)
            decode_responses: 응답 디코딩 여부
            compression_enabled: 압축 사용 여부
        """
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.encoding = encoding
        self.socket_timeout = socket_timeout
        self.decode_responses = decode_responses
        self.compression_enabled = compression_enabled
        
        self._redis: Optional[Redis] = None
        self._connected = False
        
        # 메트릭
        self.hit_count = 0
        self.miss_count = 0
        self.error_count = 0
        
    async def connect(self) -> None:
        """Redis 연결 수립"""
        if not self._connected:
            try:
                self._redis = await aioredis.from_url(
                    self.redis_url,
                    encoding=self.encoding,
                    socket_timeout=self.socket_timeout,
                    decode_responses=self.decode_responses
                )
                self._connected = True
                logger.info("Redis 연결 성공")
            except RedisError as e:
                logger.error(f"Redis 연결 실패: {e}")
                raise
                
    async def disconnect(self) -> None:
        """Redis 연결 종료"""
        if self._connected and self._redis:
            await self._redis.close()
            self._connected = False
            logger.info("Redis 연결 종료")
            
    async def get(self, key: str) -> Any:
        """
        캐시에서 값 검색
        
        Args:
            key: 캐시 키
            
        Returns:
            캐시된 값 또는 None
        """
        if not self._connected:
            await self.connect()
            
        try:
            value = await self._redis.get(key)
            if value:
                # 압축 해제
                if self.compression_enabled and value.startswith(b"\x1f\x8b"):
                    value = gzip.decompress(value).decode()
                    
                result = json.loads(value)
                self.hit_count += 1
                return result
                
            self.miss_count += 1
            return None
            
        except RedisError as e:
            logger.error(f"Redis get 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return None
            
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error(f"데이터 디코딩 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return None
            
    async def set(
        self, 
        key: str, 
        value: Any, 
        expiry: Optional[int] = None,
        nx: bool = False,
        xx: bool = False
    ) -> bool:
        """
        캐시에 값 저장
        
        Args:
            key: 캐시 키
            value: 저장할 값
            expiry: 만료 시간(초)
            nx: 키가 없을 때만 저장
            xx: 키가 있을 때만 저장
            
        Returns:
            성공 여부
        """
        if not self._connected:
            await self.connect()
            
        expiry = expiry if expiry is not None else self.default_ttl
        
        try:
            serialized = json.dumps(value)
            
            # 압축
            if (
                self.compression_enabled and 
                len(serialized) > COMPRESSION_THRESHOLD
            ):
                serialized = gzip.compress(serialized.encode())
                
            # 저장 옵션 설정
            options = {}
            if nx:
                options["nx"] = True
            elif xx:
                options["xx"] = True
                
            if expiry > 0:
                options["ex"] = expiry
                
            await self._redis.set(key, serialized, **options)
            return True
            
        except RedisError as e:
            logger.error(f"Redis set 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return False
            
        except (TypeError, ValueError) as e:
            logger.error(f"데이터 직렬화 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return False
            
    async def delete(self, key: str) -> bool:
        """
        캐시에서 키 삭제
        
        Args:
            key: 캐시 키
            
        Returns:
            성공 여부
        """
        if not self._connected:
            await self.connect()
            
        try:
            return bool(await self._redis.delete(key))
        except RedisError as e:
            logger.error(f"Redis delete 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return False
            
    async def exists(self, key: str) -> bool:
        """
        키가 캐시에 존재하는지 확인
        
        Args:
            key: 확인할 캐시 키
            
        Returns:
            존재 여부
        """
        if not self._connected:
            await self.connect()
            
        try:
            return bool(await self._redis.exists(key))
        except RedisError as e:
            logger.error(f"Redis exists 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return False
            
    async def clear(self) -> bool:
        """
        캐시 전체 삭제
        
        Returns:
            성공 여부
        """
        if not self._connected:
            await self.connect()
            
        try:
            await self._redis.flushdb()
            return True
        except RedisError as e:
            logger.error(f"Redis clear 실패: {e}")
            self.error_count += 1
            return False
            
    async def scan(
        self, 
        pattern: str, 
        count: int = REDIS_BATCH_SIZE,
        _type: Optional[str] = None
    ) -> List[str]:
        """
        패턴에 맞는 키 검색
        
        Args:
            pattern: 검색 패턴
            count: 한 번에 검색할 키 수
            _type: 키 타입 필터
            
        Returns:
            검색된 키 목록
        """
        if not self._connected:
            await self.connect()
            
        keys = []
        try:
            cursor = 0
            while True:
                cursor, batch = await self._redis.scan(cursor, pattern, count)
                
                # 타입 필터링
                if _type:
                    filtered = []
                    for key in batch:
                        key_type = await self._redis.type(key)
                        if key_type == _type:
                            filtered.append(key)
                    batch = filtered
                    
                keys.extend(batch)
                if cursor == 0:
                    break
            return keys
            
        except RedisError as e:
            logger.error(f"Redis scan 실패 - 패턴: {pattern}, 오류: {e}")
            self.error_count += 1
            return []
            
    async def ttl(self, key: str) -> int:
        """
        키의 남은 만료 시간 조회
        
        Args:
            key: 캐시 키
            
        Returns:
            남은 시간(초), -1(영구 키), -2(존재하지 않음)
        """
        if not self._connected:
            await self.connect()
            
        try:
            return await self._redis.ttl(key)
        except RedisError as e:
            logger.error(f"Redis ttl 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return -2
            
    async def expire(self, key: str, seconds: int) -> bool:
        """
        키 만료 시간 설정
        
        Args:
            key: 캐시 키
            seconds: 만료 시간(초)
            
        Returns:
            성공 여부
        """
        if not self._connected:
            await self.connect()
            
        try:
            return bool(await self._redis.expire(key, seconds))
        except RedisError as e:
            logger.error(f"Redis expire 실패 - 키: {key}, 오류: {e}")
            self.error_count += 1
            return False
            
    async def get_memory_usage(self) -> Dict[str, Any]:
        """
        Redis 메모리 사용량 조회
        
        Returns:
            메모리 사용량 정보
        """
        if not self._connected:
            await self.connect()
            
        try:
            info = await self._redis.info("memory")
            return {
                "used_memory": info.get("used_memory", 0),
                "used_memory_peak": info.get("used_memory_peak", 0),
                "used_memory_lua": info.get("used_memory_lua", 0),
                "maxmemory": info.get("maxmemory", 0),
                "maxmemory_policy": info.get("maxmemory_policy", ""),
                "mem_fragmentation_ratio": info.get("mem_fragmentation_ratio", 0)
            }
        except RedisError as e:
            logger.error(f"Redis 메모리 사용량 조회 실패: {e}")
            self.error_count += 1
            return {}
            
    async def get_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보 조회
        
        Returns:
            통계 정보
        """
        if not self._connected:
            await self.connect()
            
        try:
            info = await self._redis.info()
            stats = {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_peak": info.get("used_memory_peak", 0),
                "total_connections_received": info.get("total_connections_received", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "instantaneous_ops_per_sec": info.get("instantaneous_ops_per_sec", 0),
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "error_count": self.error_count,
                "hit_ratio": self.hit_count / max(self.hit_count + self.miss_count, 1)
            }
            
            # 키 통계
            key_stats = await self._redis.info("keyspace")
            if key_stats:
                db_stats = next((v for k, v in key_stats.items() if k.startswith("db")), {})
                stats.update({
                    "total_keys": db_stats.get("keys", 0),
                    "expires": db_stats.get("expires", 0),
                    "avg_ttl": db_stats.get("avg_ttl", 0)
                })
                
            return stats
            
        except RedisError as e:
            logger.error(f"Redis 통계 정보 조회 실패: {e}")
            self.error_count += 1
            return {
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "error_count": self.error_count,
                "hit_ratio": self.hit_count / max(self.hit_count + self.miss_count, 1)
            }
            
    async def set_many(
        self,
        items: Dict[str, Any],
        expiry: Optional[int] = None
    ) -> Dict[str, bool]:
        """
        여러 키-값 쌍을 한 번에 저장
        
        Args:
            items: 키-값 쌍 딕셔너리
            expiry: 만료 시간(초)
            
        Returns:
            키별 성공 여부
        """
        if not self._connected:
            await self.connect()
            
        expiry = expiry if expiry is not None else self.default_ttl
        results = {}
        
        try:
            async with self._redis.pipeline() as pipe:
                # 파이프라인에 명령 추가
                for key, value in items.items():
                    try:
                        serialized = json.dumps(value)
                        if (
                            self.compression_enabled and 
                            len(serialized) > COMPRESSION_THRESHOLD
                        ):
                            serialized = gzip.compress(serialized.encode())
                            
                        await pipe.set(key, serialized, ex=expiry)
                        results[key] = True
                        
                    except (TypeError, ValueError) as e:
                        logger.error(f"데이터 직렬화 실패 - 키: {key}, 오류: {e}")
                        results[key] = False
                        self.error_count += 1
                        
                # 파이프라인 실행
                await pipe.execute()
                
        except RedisError as e:
            logger.error(f"Redis set_many 실패: {e}")
            self.error_count += 1
            # 실패한 키들은 False로 표시
            for key in items:
                if key not in results:
                    results[key] = False
                    
        return results
        
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """
        여러 키의 값을 한 번에 조회
        
        Args:
            keys: 조회할 키 목록
            
        Returns:
            키-값 쌍 딕셔너리
        """
        if not self._connected:
            await self.connect()
            
        results = {}
        
        try:
            # 파이프라인으로 한 번에 조회
            values = await self._redis.mget(keys)
            
            for key, value in zip(keys, values):
                if value is None:
                    self.miss_count += 1
                    continue
                    
                try:
                    # 압축 해제
                    if self.compression_enabled and value.startswith(b"\x1f\x8b"):
                        value = gzip.decompress(value).decode()
                        
                    results[key] = json.loads(value)
                    self.hit_count += 1
                    
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    logger.error(f"데이터 디코딩 실패 - 키: {key}, 오류: {e}")
                    self.error_count += 1
                    
        except RedisError as e:
            logger.error(f"Redis get_many 실패: {e}")
            self.error_count += 1
            
        return results
        
    async def delete_many(self, keys: List[str]) -> int:
        """
        여러 키를 한 번에 삭제
        
        Args:
            keys: 삭제할 키 목록
            
        Returns:
            삭제된 키 수
        """
        if not self._connected:
            await self.connect()
            
        try:
            return await self._redis.delete(*keys)
        except RedisError as e:
            logger.error(f"Redis delete_many 실패: {e}")
            self.error_count += 1
            return 0
            
    def lock(
        self,
        key: str,
        timeout: int = 10,
        retry_interval: float = 0.1,
        blocking: bool = True
    ) -> RedisLock:
        """
        분산 락 생성
        
        Args:
            key: 락 키
            timeout: 락 타임아웃(초)
            retry_interval: 재시도 간격(초)
            blocking: 블로킹 모드 여부
            
        Returns:
            Redis 락 객체
        """
        return RedisLock(
            self._redis,
            key,
            timeout=timeout,
            retry_interval=retry_interval,
            blocking=blocking
        ) 