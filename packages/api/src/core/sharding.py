"""
데이터베이스 샤딩 관리 모듈
"""

import hashlib
import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from packages.api.src.coreconfig import settings

logger = logging.getLogger(__name__)


class ShardingManager:
    """데이터베이스 샤딩 관리 클래스"""

    def __init__(self, num_shards: int = 4):
        """
        샤딩 매니저 초기화

        Args:
            num_shards: 샤드 수
        """
        self.num_shards = num_shards
        self.logger = logger
        self.config = {}
        self.nodes = []
        self.shard_key = None
        self.distribution_strategy = None

    def initialize(self, config: dict) -> bool:
        """
        샤딩 매니저 구성 초기화

        Args:
            config: 샤딩 설정 정보

        Returns:
            bool: 초기화 성공 여부
        """
        try:
            self.config = config
            self.logger.info(f"샤딩 매니저 초기화 완료: {config}")
            return True
        except Exception as e:
            self.logger.error(f"샤딩 매니저 초기화 실패: {str(e)}")
            return False

    def register_nodes(self, nodes: list) -> bool:
        """
        샤드 노드 등록

        Args:
            nodes: 샤드 노드 목록

        Returns:
            bool: 등록 성공 여부
        """
        try:
            self.nodes = nodes
            self.logger.info(f"샤드 노드 등록 완료: {len(nodes)}개 노드")
            return True
        except Exception as e:
            self.logger.error(f"샤드 노드 등록 실패: {str(e)}")
            return False

    def set_shard_key(self, key_name: str) -> bool:
        """
        샤딩 키 설정

        Args:
            key_name: 샤딩 키 이름

        Returns:
            bool: 설정 성공 여부
        """
        try:
            self.shard_key = key_name
            self.logger.info(f"샤딩 키 설정 완료: {key_name}")
            return True
        except Exception as e:
            self.logger.error(f"샤딩 키 설정 실패: {str(e)}")
            return False

    def set_distribution_strategy(self, strategy: dict) -> bool:
        """
        분산 전략 설정

        Args:
            strategy: 분산 전략 정보

        Returns:
            bool: 설정 성공 여부
        """
        try:
            self.distribution_strategy = strategy
            self.logger.info(f"분산 전략 설정 완료: {strategy['type']}")
            return True
        except Exception as e:
            self.logger.error(f"분산 전략 설정 실패: {str(e)}")
            return False

    def configure_monitoring(self, config: dict) -> bool:
        """
        모니터링 설정

        Args:
            config: 모니터링 설정 정보

        Returns:
            bool: 설정 성공 여부
        """
        try:
            self.monitoring_config = config
            self.logger.info("샤드 모니터링 설정 완료")
            return True
        except Exception as e:
            self.logger.error(f"샤드 모니터링 설정 실패: {str(e)}")
            return False

    def get_shard_key(self, value: Union[str, int]) -> str:
        """
        샤드 키 생성

        Args:
            value: 샤드 키를 생성할 값

        Returns:
            str: 생성된 샤드 키
        """
        value_str = str(value)
        return hashlib.md5(value_str.encode()).hexdigest()

    def get_shard_id(self, shard_key: str) -> int:
        """
        샤드 ID 계산

        Args:
            shard_key: 샤드 키

        Returns:
            int: 샤드 ID
        """
        # 샤드 키의 첫 8자리를 16진수로 해석하여 샤드 수로 나눈 나머지 사용
        return int(shard_key[:8], 16) % self.num_shards

    def get_shard_info(self, value: Union[str, int]) -> Tuple[str, int]:
        """
        샤드 정보 조회

        Args:
            value: 샤드 키를 생성할 값

        Returns:
            Tuple[str, int]: (샤드 키, 샤드 ID)
        """
        shard_key = self.get_shard_key(value)
        shard_id = self.get_shard_id(shard_key)
        return shard_key, shard_id

    def get_connection_string(self, shard_id: int) -> str:
        """
        샤드별 데이터베이스 연결 문자열 반환

        Args:
            shard_id: 샤드 ID

        Returns:
            str: 데이터베이스 연결 문자열
        """
        base_url = settings.DATABASE_URL
        if "?" in base_url:
            return f"{base_url}&shard={shard_id}"
        return f"{base_url}?shard={shard_id}"

    def get_all_shards(self) -> List[Dict[str, Any]]:
        """
        모든 샤드 정보 반환

        Returns:
            List[Dict[str, Any]]: 샤드 정보 목록
        """
        return [
            {"shard_id": i, "connection_string": self.get_connection_string(i)}
            for i in range(self.num_shards)
        ]


# 전역 샤딩 매니저 인스턴스
sharding_manager = ShardingManager()
