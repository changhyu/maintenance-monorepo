"""
웹소켓 관리 모듈

실시간 양방향 통신을 위한 WebSocket 관리 기능을 제공합니다.
연결 관리, 이벤트 처리, 메시지 큐잉 등을 지원합니다.
"""

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect
from redis.asyncio import Redis
from redis.exceptions import RedisError

from packages.api.src.coreconfig import settings
from packages.api.src.corelogging import get_logger
from packages.api.src.coremetrics import metrics_collector

logger = get_logger(__name__)


class WebSocketManager:
    """웹소켓 연결 및 이벤트 관리 클래스"""

    def __init__(self):
        """웹소켓 매니저 초기화"""
        # 활성 연결 관리
        self.active_connections: Dict[str, Dict[str, WebSocket]] = defaultdict(dict)
        self.user_rooms: Dict[str, Set[str]] = defaultdict(set)
        self.room_subscribers: Dict[str, Set[str]] = defaultdict(set)

        # 메시지 큐
        self.message_queue: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.queue_size_limit = getattr(settings, "WS_QUEUE_SIZE_LIMIT", 1000)

        # Redis Pub/Sub
        self.redis: Optional[Redis] = None
        self.pubsub = None

        # 재연결 설정
        self.max_reconnect_attempts = 3
        self.reconnect_delay = 5  # 초

        # 이벤트 핸들러
        self.event_handlers: Dict[str, List[Callable]] = defaultdict(list)

    async def initialize(self):
        """비동기 초기화"""
        await self._setup_redis()
        await self._start_connection_monitor()

    async def _setup_redis(self) -> None:
        """Redis Pub/Sub 설정"""
        try:
            self.redis = Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
            )
            self.pubsub = self.redis.pubsub()
            await self.pubsub.subscribe("websocket_events")
            logger.info("Redis Pub/Sub 연결 성공")

            # 메시지 수신 루프 시작
            asyncio.create_task(self._redis_message_handler())
        except Exception as e:
            logger.error(f"Redis Pub/Sub 연결 실패: {str(e)}")

    async def _start_connection_monitor(self) -> None:
        """연결 상태 모니터링 시작"""
        asyncio.create_task(self._monitor_connections())

    async def connect(
        self, websocket: WebSocket, client_id: str, user_id: Optional[str] = None
    ) -> None:
        """
        새로운 웹소켓 연결 수락

        Args:
            websocket: WebSocket 인스턴스
            client_id: 클라이언트 식별자
            user_id: 사용자 ID (선택)
        """
        await websocket.accept()
        self.active_connections[user_id or "anonymous"][client_id] = websocket

        # 연결 메트릭 업데이트
        metrics_collector.update_connection_count(self._get_total_connections())

        # 큐에 있는 메시지 전송
        if user_id and user_id in self.message_queue:
            await self._send_queued_messages(user_id)

    async def disconnect(self, client_id: str, user_id: Optional[str] = None) -> None:
        """
        웹소켓 연결 종료

        Args:
            client_id: 클라이언트 식별자
            user_id: 사용자 ID (선택)
        """
        user_connections = self.active_connections[user_id or "anonymous"]
        if client_id in user_connections:
            websocket = user_connections[client_id]
            await websocket.close()
            del user_connections[client_id]

            # 사용자의 연결이 없으면 제거
            if not user_connections:
                del self.active_connections[user_id or "anonymous"]

            # 룸 구독 해제
            for room in list(self.user_rooms.get(user_id, set())):
                await self.leave_room(user_id, room)

        # 연결 메트릭 업데이트
        metrics_collector.update_connection_count(self._get_total_connections())

    async def send_personal_message(
        self,
        message: Any,
        user_id: str,
        message_type: str = "message",
        retry: bool = True,
    ) -> bool:
        """
        특정 사용자에게 메시지 전송

        Args:
            message: 전송할 메시지
            user_id: 수신자 ID
            message_type: 메시지 유형
            retry: 재시도 여부

        Returns:
            전송 성공 여부
        """
        if user_id not in self.active_connections:
            # 오프라인 사용자면 메시지 큐에 저장
            self._queue_message(user_id, message, message_type)
            return False

        try:
            message_data = {
                "type": message_type,
                "data": message,
                "timestamp": datetime.now().isoformat(),
            }

            for websocket in self.active_connections[user_id].values():
                try:
                    await websocket.send_json(message_data)
                except WebSocketDisconnect:
                    continue
                except Exception as e:
                    logger.error(f"메시지 전송 실패 (사용자 ID: {user_id}): {str(e)}")
                    if retry:
                        self._queue_message(user_id, message, message_type)
                    return False
            return True
        except Exception as e:
            logger.error(f"메시지 전송 중 오류 발생: {str(e)}")
            if retry:
                self._queue_message(user_id, message, message_type)
            return False

    async def broadcast(
        self,
        message: Any,
        exclude: Optional[Set[str]] = None,
        message_type: str = "broadcast",
    ) -> None:
        """
        모든 연결된 클라이언트에게 메시지 브로드캐스트

        Args:
            message: 전송할 메시지
            exclude: 제외할 사용자 ID 목록
            message_type: 메시지 유형
        """
        exclude = exclude or set()
        message_data = {
            "type": message_type,
            "data": message,
            "timestamp": datetime.now().isoformat(),
        }

        for user_id, connections in self.active_connections.items():
            if user_id in exclude:
                continue

            for websocket in connections.values():
                try:
                    await websocket.send_json(message_data)
                except Exception as e:
                    logger.error(f"브로드캐스트 실패 (사용자 ID: {user_id}): {str(e)}")

    async def join_room(self, user_id: str, room: str) -> None:
        """
        사용자를 채팅방에 참여시킴

        Args:
            user_id: 사용자 ID
            room: 채팅방 이름
        """
        self.user_rooms[user_id].add(room)
        self.room_subscribers[room].add(user_id)

    async def leave_room(self, user_id: str, room: str) -> None:
        """
        사용자를 채팅방에서 퇴장시킴

        Args:
            user_id: 사용자 ID
            room: 채팅방 이름
        """
        self.user_rooms[user_id].discard(room)
        self.room_subscribers[room].discard(user_id)

        # 빈 채팅방 정리
        if not self.room_subscribers[room]:
            del self.room_subscribers[room]

    async def send_room_message(
        self,
        room: str,
        message: Any,
        sender_id: Optional[str] = None,
        message_type: str = "room_message",
    ) -> None:
        """
        채팅방의 모든 참여자에게 메시지 전송

        Args:
            room: 채팅방 이름
            message: 전송할 메시지
            sender_id: 발신자 ID
            message_type: 메시지 유형
        """
        if room not in self.room_subscribers:
            return

        message_data = {
            "type": message_type,
            "room": room,
            "sender_id": sender_id,
            "data": message,
            "timestamp": datetime.now().isoformat(),
        }

        for user_id in self.room_subscribers[room]:
            if user_id == sender_id:
                continue
            await self.send_personal_message(message_data, user_id, message_type)

    def register_event_handler(self, event_type: str, handler: Callable) -> None:
        """
        이벤트 핸들러 등록

        Args:
            event_type: 이벤트 유형
            handler: 이벤트 처리 함수
        """
        self.event_handlers[event_type].append(handler)

    async def trigger_event(self, event_type: str, data: Any) -> None:
        """
        이벤트 트리거

        Args:
            event_type: 이벤트 유형
            data: 이벤트 데이터
        """
        if event_type in self.event_handlers:
            for handler in self.event_handlers[event_type]:
                try:
                    await handler(data)
                except Exception as e:
                    logger.error(f"이벤트 핸들러 실행 실패 ({event_type}): {str(e)}")

    def _queue_message(self, user_id: str, message: Any, message_type: str) -> None:
        """메시지를 큐에 추가"""
        if len(self.message_queue[user_id]) >= self.queue_size_limit:
            self.message_queue[user_id].pop(0)  # 가장 오래된 메시지 제거

        self.message_queue[user_id].append(
            {
                "type": message_type,
                "data": message,
                "timestamp": datetime.now().isoformat(),
            }
        )

    async def _send_queued_messages(self, user_id: str) -> None:
        """큐에 있는 메시지 전송"""
        if user_id in self.message_queue:
            for message in self.message_queue[user_id]:
                await self.send_personal_message(
                    message["data"], user_id, message["type"], retry=False
                )
            del self.message_queue[user_id]

    async def _redis_message_handler(self) -> None:
        """Redis Pub/Sub 메시지 처리"""
        while True:
            try:
                message = await self.pubsub.get_message(ignore_subscribe_messages=True)
                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    await self.trigger_event(data["event_type"], data["data"])
            except Exception as e:
                logger.error(f"Redis 메시지 처리 실패: {str(e)}")
            await asyncio.sleep(0.1)

    async def _monitor_connections(self) -> None:
        """연결 상태 주기적 모니터링"""
        while True:
            try:
                # 연결 상태 확인
                for user_id, connections in list(self.active_connections.items()):
                    for client_id, websocket in list(connections.items()):
                        try:
                            await websocket.send_json({"type": "ping"})
                        except Exception:
                            await self.disconnect(client_id, user_id)

                # Redis 연결 확인
                if not self.redis or not await self.redis.ping():
                    logger.warning("Redis 연결 끊김, 재연결 시도")
                    await self._setup_redis()

            except Exception as e:
                logger.error(f"연결 모니터링 중 오류 발생: {str(e)}")

            await asyncio.sleep(30)  # 30초마다 확인

    def _get_total_connections(self) -> int:
        """전체 활성 연결 수 반환"""
        return sum(len(connections) for connections in self.active_connections.values())


# 웹소켓 매니저 인스턴스 생성
websocket_manager = WebSocketManager()
