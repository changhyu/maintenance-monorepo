"""
Prisma 데이터베이스 연결 모듈
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from prisma import Prisma

logger = logging.getLogger(__name__)


class Database:
    """Prisma 데이터베이스 클라이언트 관리"""

    def __init__(self):
        """데이터베이스 초기화"""
        self._client: Optional[Prisma] = None
        self._initialized = False

    async def connect(self) -> None:
        """데이터베이스 연결"""
        if not self._initialized:
            try:
                self._client = Prisma()
                await self._client.connect()
                self._initialized = True
                logger.info("Prisma 데이터베이스 연결 성공")
            except Exception as e:
                logger.error(f"Prisma 데이터베이스 연결 실패: {str(e)}")
                raise

    async def disconnect(self) -> None:
        """데이터베이스 연결 해제"""
        if self._initialized and self._client is not None:
            await self._client.disconnect()
            self._initialized = False
            logger.info("Prisma 데이터베이스 연결 해제")

    @property
    def client(self) -> Prisma:
        """Prisma 클라이언트 인스턴스 반환"""
        if not self._initialized or self._client is None:
            raise RuntimeError("데이터베이스가 초기화되지 않았습니다.")
        return self._client


# 전역 데이터베이스 인스턴스
db = Database()


@asynccontextmanager
async def get_db() -> AsyncGenerator[Prisma, None]:
    """
    데이터베이스 세션 생성

    사용 예시:
    ```python
    async with get_db() as prisma:
        vehicles = await prisma.vehicle.find_many()
    ```
    """
    if not db._initialized:
        await db.connect()

    try:
        yield db.client
    except Exception as e:
        logger.error(f"데이터베이스 작업 중 오류 발생: {str(e)}")
        raise
