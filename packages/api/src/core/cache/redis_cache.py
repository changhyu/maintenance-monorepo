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

try:
    import redis.asyncio as aioredis
    from redis.asyncio import Redis, WatchError
    from redis.exceptions import LockError, RedisError

    Pipeline = Redis
except ImportError:
    # 이전 버전 호환성을 위한 가져오기
    import aioredis
    from aioredis.client import Redis, Pipeline
    from aioredis.exceptions import RedisError, LockError, WatchError

from packages.api.src.core.cacheconstants import (
    COMPRESSION_THRESHOLD,
    DEFAULT_CACHE_TTL,
    LOCK_TIMEOUT,
    MAX_RETRY_ATTEMPTS,
    REDIS_BATCH_SIZE,
    REDIS_DECODE_RESPONSES,
    REDIS_ENCODING,
    REDIS_SOCKET_TIMEOUT,
    RETRY_DELAY,
)
from packages.api.src.core.cacheinterfaces import MetricsData, RedisInterface

logger = logging.getLogger(__name__)


class RedisLock:
    """
    Redis 기반 분산 락

    데드락 방지와 자동 락 해제를 지원하는 분산 락 구현
    """

    def __init__(
        self,
        redis: Any,
        key: str,
        timeout: int = 10,
        retry_interval: float = 0.1,
        blocking: bool = True,
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
                self.key, self.lock_id, nx=True, ex=self.timeout
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


class RedisCache(RedisInterface):
    """
    Redis 캐시 관리자

    Redis를 사용한 분산 캐시 구현을 제공합니다.
    """

    def __init__(
        self,
        settings,
        default_ttl: int = DEFAULT_CACHE_TTL,
        encoding: str = REDIS_ENCODING,
        socket_timeout: float = REDIS_SOCKET_TIMEOUT,
        decode_responses: bool = REDIS_DECODE_RESPONSES,
        compression_enabled: bool = True,
    ):
        """
        Redis 캐시 관리자 초기화

        Args:
            settings: 캐시 설정 객체
            default_ttl: 기본 TTL(초)
            encoding: 인코딩 방식
            socket_timeout: 소켓 타임아웃(초)
            decode_responses: 응답 디코딩 여부
            compression_enabled: 압축 사용 여부
        """
        self.redis_url = (
            settings.redis_url
            if settings and hasattr(settings, "redis_url")
            else "redis://localhost:6379/0"
        )
        self.default_ttl = default_ttl
        self.encoding = encoding
        self.socket_timeout = socket_timeout
        self.decode_responses = decode_responses
        self.compression_enabled = compression_enabled

        self._redis = None
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
                    decode_responses=self.decode_responses,
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
                if (
                    self.compression_enabled
                    and isinstance(value, bytes)
                    and value.startswith(b"\x1f\x8b")
                ):
                    value = gzip.decompress(value).decode()
                elif isinstance(value, bytes):
                    value = value.decode()

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
        xx: bool = False,
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
            if self.compression_enabled and len(serialized) > COMPRESSION_THRESHOLD:
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
            result = bool(await self._redis.delete(key))
            if result:
                logger.debug(f"캐시 삭제 성공: {key}")
            else:
                logger.debug(f"캐시 삭제 불필요(키 없음): {key}")
            return result
        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis delete 실패 - 키: {key}, 오류: {e}")
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
            result = bool(await self._redis.exists(key))
            logger.debug(f"캐시 키 확인: {key}, 존재: {result}")
            return result
        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis exists 실패 - 키: {key}, 오류: {e}")
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
            logger.info("캐시 전체 삭제 완료")
            return True
        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis clear 실패: {e}")
            return False

    async def scan(
        self, pattern: str, count: int = REDIS_BATCH_SIZE, _type: Optional[str] = None
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

        keys: List[str] = []
        try:
            cursor = 0
            scan_count = 0

            logger.debug(f"키 스캔 시작 - 패턴: {pattern}, 타입: {_type}")

            while True:
                cursor, batch = await self._redis.scan(cursor, pattern, count)
                scan_count += 1

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

            logger.debug(
                f"키 스캔 완료 - 패턴: {pattern}, 찾은 키: {len(keys)}개, 반복 횟수: {scan_count}"
            )
            return keys

        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis scan 실패 - 패턴: {pattern}, 오류: {e}")
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
            ttl_value = await self._redis.ttl(key)
            if ttl_value > 0:
                logger.debug(f"키 TTL 조회: {key}, 남은 시간: {ttl_value}초")
            elif ttl_value == -1:
                logger.debug(f"키 TTL 조회: {key}, 영구 키")
            else:
                logger.debug(f"키 TTL 조회: {key}, 키 없음")
            return ttl_value
        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis ttl 실패 - 키: {key}, 오류: {e}")
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
            result = bool(await self._redis.expire(key, seconds))
            if result:
                logger.debug(f"키 만료 시간 설정: {key}, 만료 시간: {seconds}초")
            else:
                logger.debug(f"키 만료 시간 설정 실패(키 없음): {key}")
            return result
        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis expire 실패 - 키: {key}, 오류: {e}")
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
            memory_data = {
                "used_memory": info.get("used_memory", 0),
                "used_memory_peak": info.get("used_memory_peak", 0),
                "used_memory_lua": info.get("used_memory_lua", 0),
                "maxmemory": info.get("maxmemory", 0),
                "maxmemory_policy": info.get("maxmemory_policy", ""),
                "mem_fragmentation_ratio": info.get("mem_fragmentation_ratio", 0),
            }

            # 메모리 사용량 경고 수준 확인
            if info.get("maxmemory", 0) > 0:
                usage_ratio = info.get("used_memory", 0) / info.get("maxmemory", 1)
                memory_data["usage_ratio"] = usage_ratio

                if usage_ratio > CRITICAL_MEMORY_THRESHOLD:
                    logger.warning(
                        f"Redis 메모리 위험 수준: {usage_ratio:.1%}, 즉시 조치 필요"
                    )
                elif usage_ratio > MEMORY_USAGE_THRESHOLD:
                    logger.warning(f"Redis 메모리 경고 수준: {usage_ratio:.1%}")

            logger.debug(f"Redis 메모리 사용량: {memory_data['used_memory']} 바이트")
            return memory_data

        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis 메모리 사용량 조회 실패: {e}")
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

            # 히트율 계산
            total_ops = self.hit_count + self.miss_count
            hit_ratio = self.hit_count / max(total_ops, 1)

            stats: Dict[str, Any] = {
                # 연결 정보
                "connected_clients": info.get("connected_clients", 0),
                "blocked_clients": info.get("blocked_clients", 0),
                # 메모리 정보
                "used_memory": info.get("used_memory", 0),
                "used_memory_peak": info.get("used_memory_peak", 0),
                "used_memory_rss": info.get("used_memory_rss", 0),
                # 연산 정보
                "total_connections_received": info.get("total_connections_received", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "instantaneous_ops_per_sec": info.get("instantaneous_ops_per_sec", 0),
                # 캐시 성능 정보
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "error_count": self.error_count,
                "hit_ratio": hit_ratio,
                "total_ops": total_ops,
            }

            # 키 통계
            key_stats = await self._redis.info("keyspace")
            if key_stats:
                db_stats = next(
                    (v for k, v in key_stats.items() if k.startswith("db")), {}
                )
                stats.update(
                    {
                        "total_keys": db_stats.get("keys", 0),
                        "expires": db_stats.get("expires", 0),
                        "avg_ttl": db_stats.get("avg_ttl", 0),
                    }
                )

            # 처리량 정보 로깅
            logger.info(
                f"Redis 통계: 처리량={stats['instantaneous_ops_per_sec']}ops/s, 히트율={hit_ratio:.1%}"
            )

            return stats

        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis 통계 정보 조회 실패: {e}")

            # 기본 통계만 반환
            return {
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "error_count": self.error_count,
                "hit_ratio": self.hit_count / max(self.hit_count + self.miss_count, 1),
            }

    async def set_many(
        self, items: Dict[str, Any], expiry: Optional[int] = None
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
        results: Dict[str, bool] = {}

        if not items:
            logger.debug("set_many: 저장할 항목 없음")
            return results

        try:
            logger.debug(f"일괄 캐시 저장: {len(items)}개 항목, TTL: {expiry}초")

            async with self._redis.pipeline() as pipe:
                # 파이프라인에 명령 추가
                for key, value in items.items():
                    try:
                        serialized = json.dumps(value)
                        if (
                            self.compression_enabled
                            and len(serialized) > self.COMPRESSION_THRESHOLD
                        ):
                            serialized = gzip.compress(serialized.encode())

                        await pipe.set(key, serialized, ex=expiry)
                        results[key] = True

                    except (TypeError, ValueError) as e:
                        self.error_count += 1
                        logger.error(f"데이터 직렬화 실패 - 키: {key}, 오류: {e}")
                        results[key] = False

                # 파이프라인 실행
                await pipe.execute()
                logger.debug(
                    f"일괄 캐시 저장 완료: 성공={sum(1 for v in results.values() if v)}, 실패={sum(1 for v in results.values() if not v)}"
                )

        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis set_many 실패: {e}")
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

        results: Dict[str, Any] = {}

        if not keys:
            logger.debug("get_many: 조회할 키 없음")
            return results

        try:
            logger.debug(f"일괄 캐시 조회: {len(keys)}개 키")

            # 파이프라인으로 한 번에 조회
            values = await self._redis.mget(keys)

            hits = 0
            misses = 0

            for key, value in zip(keys, values):
                if value is None:
                    misses += 1
                    continue

                try:
                    # 압축 해제
                    if (
                        self.compression_enabled
                        and isinstance(value, bytes)
                        and value.startswith(b"\x1f\x8b")
                    ):
                        value = gzip.decompress(value).decode()
                    elif isinstance(value, bytes):
                        value = value.decode()

                    results[key] = json.loads(value)
                    hits += 1

                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    self.error_count += 1
                    logger.error(f"데이터 디코딩 실패 - 키: {key}, 오류: {e}")

            # 통계 업데이트
            self.hit_count += hits
            self.miss_count += misses

            logger.debug(f"일괄 캐시 조회 완료: 히트={hits}, 미스={misses}")

        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis get_many 실패: {e}")

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

        if not keys:
            logger.debug("delete_many: 삭제할 키 없음")
            return 0

        try:
            logger.debug(f"일괄 캐시 삭제: {len(keys)}개 키")
            deleted = await self._redis.delete(*keys)
            logger.debug(f"일괄 캐시 삭제 완료: {deleted}개 삭제됨")
            return deleted
        except RedisError as e:
            self.error_count += 1
            logger.error(f"Redis delete_many 실패: {e}")
            return 0

    def lock(
        self,
        key: str,
        timeout: int = LOCK_TIMEOUT,
        retry_interval: float = RETRY_DELAY,
        blocking: bool = True,
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
        if not self._redis:
            raise RuntimeError(
                "Redis 연결이 설정되지 않았습니다. connect()를 먼저 호출하세요."
            )

        logger.debug(f"분산 락 생성: {key}, 타임아웃: {timeout}초, 블로킹: {blocking}")

        return RedisLock(
            self._redis,
            key,
            timeout=timeout,
            retry_interval=retry_interval,
            blocking=blocking,
        )

    async def check_health(self) -> bool:
        """
        헬스 체크 수행 (인터페이스 구현)

        Returns:
            정상 여부
        """
        if not self._connected:
            await self.connect()

        try:
            result = bool(await self._redis.ping())
            if result:
                logger.debug("Redis 헬스 체크: 정상")
            else:
                logger.warning("Redis 헬스 체크: 응답 없음")
            return result
        except RedisError as e:
            logger.error(f"Redis 헬스 체크 실패: {e}")
            return False

    async def cleanup_expired(self) -> int:
        """
        만료된 항목 정리 (인터페이스 구현)

        Returns:
            정리된 항목 수
        """
        # Redis는 자동으로 만료된 키를 처리하므로 추가 작업 필요 없음
        logger.debug("만료된 항목 정리: Redis는 자동 처리됨")
        return 0

    async def get_metrics(self) -> MetricsData:
        """
        메트릭 데이터 조회 (인터페이스 구현)

        Returns:
            메트릭 데이터
        """
        if not self._connected:
            await self.connect()

        try:
            info = await self._redis.info()
            metrics: MetricsData = {
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "error_count": self.error_count,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
            }
            logger.debug(f"Redis 메트릭 조회: {len(metrics)} 항목")
            return metrics
        except RedisError as e:
            logger.error(f"Redis 메트릭 조회 실패: {e}")
            return {}

    async def reset_stats(self) -> None:
        """
        통계 초기화 (인터페이스 구현)
        """
        self.hit_count = 0
        self.miss_count = 0
        self.error_count = 0
        logger.info("Redis 통계 초기화 완료")

    async def optimize(self) -> bool:
        """
        캐시 최적화 (인터페이스 구현)

        Returns:
            성공 여부
        """
        if not self._connected:
            await self.connect()

        try:
            # Redis 서버 메모리 최적화 명령
            await self._redis.execute_command("MEMORY PURGE")
            logger.info("Redis 캐시 최적화 완료")
            return True
        except RedisError as e:
            logger.error(f"Redis 캐시 최적화 실패: {e}")
            return False


# 모듈이 직접 실행될 경우 테스트 코드 실행
if __name__ == "__main__":
    import asyncio
    import os

    # 로그 설정
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    async def test_redis_cache() -> bool:
        """RedisCache 테스트 함수"""
        print("RedisCache 테스트 시작...")

        # 테스트용 설정 객체
        class TestSettings:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

        try:
            # 캐시 인스턴스 생성 및 연결
            cache = RedisCache(TestSettings())
            await cache.connect()
            print("Redis 연결 성공")

            # 기본 캐시 작업 테스트
            test_key = "test:key"
            test_value = {"test": "data", "number": 42}

            # 캐시 저장
            set_result = await cache.set(test_key, test_value, expiry=60)
            print(f"캐시 저장 결과: {set_result}")

            # 캐시 조회
            get_result = await cache.get(test_key)
            print(f"캐시 조회 결과: {get_result}")

            # 캐시 키 존재 확인
            exists_result = await cache.exists(test_key)
            print(f"캐시 키 존재 여부: {exists_result}")

            # 캐시 삭제
            delete_result = await cache.delete(test_key)
            print(f"캐시 삭제 결과: {delete_result}")

            # 캐시 연결 종료
            await cache.disconnect()
            print("Redis 연결 종료")

            return True
        except Exception as e:
            print(f"테스트 중 오류 발생: {str(e)}")
            return False

    # 테스트 실행
    result = asyncio.run(test_redis_cache())
    exit(0 if result else 1)
