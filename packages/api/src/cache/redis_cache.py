"""
Redis 캐싱 계층 구현
애플리케이션 내에서 자주 사용되는 데이터를 캐싱하여 성능을 개선합니다.
"""

import json
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union, cast

import redis.asyncio as redis
from pydantic import BaseModel

from packages.api.srccore.config import settings

T = TypeVar("T")


class RedisCache:
    """Redis 기반 캐싱 기능을 제공하는 클래스"""

    def __init__(self):
        """Redis 연결 초기화"""
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
        )

    async def get(self, key: str) -> Optional[str]:
        """
        캐시에서 문자열 값을 가져옵니다.

        Args:
            key: 캐시 키

        Returns:
            캐시된 문자열 값 또는 None (캐시 미스)
        """
        return await self.redis_client.get(key)

    async def set(self, key: str, value: str, expire_seconds: int = 3600) -> None:
        """
        캐시에 문자열 값을 저장합니다.

        Args:
            key: 캐시 키
            value: 저장할 문자열 값
            expire_seconds: 캐시 만료 시간 (초 단위, 기본 1시간)
        """
        await self.redis_client.set(key, value, ex=expire_seconds)

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """
        캐시에서 JSON 값을 가져옵니다.

        Args:
            key: 캐시 키

        Returns:
            캐시된 딕셔너리 또는 None (캐시 미스)
        """
        data = await self.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_json(
        self, key: str, value: Dict[str, Any], expire_seconds: int = 3600
    ) -> None:
        """
        캐시에 JSON 값을 저장합니다.

        Args:
            key: 캐시 키
            value: 저장할 딕셔너리
            expire_seconds: 캐시 만료 시간 (초 단위, 기본 1시간)
        """
        json_data = json.dumps(value)
        await self.set(key, json_data, expire_seconds)

    async def get_model(
        self, key: str, model_class: type[BaseModel]
    ) -> Optional[BaseModel]:
        """
        캐시에서 Pydantic 모델 인스턴스를 가져옵니다.

        Args:
            key: 캐시 키
            model_class: Pydantic 모델 클래스

        Returns:
            캐시된 모델 인스턴스 또는 None (캐시 미스)
        """
        data = await self.get_json(key)
        if data:
            return model_class.parse_obj(data)
        return None

    async def set_model(
        self, key: str, model: BaseModel, expire_seconds: int = 3600
    ) -> None:
        """
        캐시에 Pydantic 모델 인스턴스를 저장합니다.

        Args:
            key: 캐시 키
            model: 저장할 Pydantic 모델 인스턴스
            expire_seconds: 캐시 만료 시간 (초 단위, 기본 1시간)
        """
        await self.set_json(key, model.dict(), expire_seconds)

    async def delete(self, key: str) -> None:
        """
        캐시에서 키를 삭제합니다.

        Args:
            key: 삭제할 캐시 키
        """
        await self.redis_client.delete(key)

    async def flush_all(self) -> None:
        """모든 캐시를 비웁니다."""
        await self.redis_client.flushall()

    async def close(self) -> None:
        """Redis 연결을 종료합니다."""
        await self.redis_client.close()
