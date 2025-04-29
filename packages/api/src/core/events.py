"""
이벤트 관리 모듈
"""

import asyncio
import logging
from functools import partial
from typing import Any, Callable, Dict, List, Optional, Set

from packages.api.src.corelogging import get_logger

logger = get_logger("events")


class EventEmitter:
    """이벤트 발신자 클래스"""

    def __init__(self):
        self._listeners: Dict[str, Set[Callable]] = {}
        self._async_listeners: Dict[str, Set[Callable]] = {}
        self._once_listeners: Dict[str, Set[Callable]] = {}
        self._async_once_listeners: Dict[str, Set[Callable]] = {}

    def on(self, event: str, listener: Callable) -> None:
        """
        이벤트 리스너 등록

        Args:
            event: 이벤트 이름
            listener: 리스너 함수
        """
        if asyncio.iscoroutinefunction(listener):
            self._async_listeners.setdefault(event, set()).add(listener)
        else:
            self._listeners.setdefault(event, set()).add(listener)

    def once(self, event: str, listener: Callable) -> None:
        """
        일회성 이벤트 리스너 등록

        Args:
            event: 이벤트 이름
            listener: 리스너 함수
        """
        if asyncio.iscoroutinefunction(listener):
            self._async_once_listeners.setdefault(event, set()).add(listener)
        else:
            self._once_listeners.setdefault(event, set()).add(listener)

    def off(self, event: str, listener: Optional[Callable] = None) -> None:
        """
        이벤트 리스너 제거

        Args:
            event: 이벤트 이름
            listener: 제거할 리스너 함수 (None이면 모든 리스너 제거)
        """
        if listener is None:
            self._listeners.pop(event, None)
            self._async_listeners.pop(event, None)
            self._once_listeners.pop(event, None)
            self._async_once_listeners.pop(event, None)
        else:
            for listeners in [
                self._listeners,
                self._async_listeners,
                self._once_listeners,
                self._async_once_listeners,
            ]:
                if event in listeners:
                    listeners[event].discard(listener)

    async def emit(self, event: str, *args: Any, **kwargs: Any) -> None:
        """
        이벤트 발생

        Args:
            event: 이벤트 이름
            *args: 리스너에 전달할 위치 인자
            **kwargs: 리스너에 전달할 키워드 인자
        """
        # 동기 리스너 실행
        for listener in self._listeners.get(event, set()):
            try:
                listener(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"이벤트 리스너 실행 중 오류 발생: {str(e)}", exc_info=True
                )

        # 비동기 리스너 실행
        for listener in self._async_listeners.get(event, set()):
            try:
                await listener(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"비동기 이벤트 리스너 실행 중 오류 발생: {str(e)}", exc_info=True
                )

        # 일회성 동기 리스너 실행
        for listener in self._once_listeners.get(event, set()):
            try:
                listener(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"일회성 이벤트 리스너 실행 중 오류 발생: {str(e)}", exc_info=True
                )
            finally:
                self.off(event, listener)

        # 일회성 비동기 리스너 실행
        for listener in self._async_once_listeners.get(event, set()):
            try:
                await listener(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"일회성 비동기 이벤트 리스너 실행 중 오류 발생: {str(e)}",
                    exc_info=True,
                )
            finally:
                self.off(event, listener)

    def emit_sync(self, event: str, *args: Any, **kwargs: Any) -> None:
        """
        동기 이벤트 발생

        Args:
            event: 이벤트 이름
            *args: 리스너에 전달할 위치 인자
            **kwargs: 리스너에 전달할 키워드 인자
        """
        # 동기 리스너만 실행
        for listener in self._listeners.get(event, set()):
            try:
                listener(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"동기 이벤트 리스너 실행 중 오류 발생: {str(e)}", exc_info=True
                )

        # 일회성 동기 리스너 실행
        for listener in self._once_listeners.get(event, set()):
            try:
                listener(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"일회성 동기 이벤트 리스너 실행 중 오류 발생: {str(e)}",
                    exc_info=True,
                )
            finally:
                self.off(event, listener)

    def listeners(self, event: str) -> List[Callable]:
        """
        등록된 모든 리스너 반환

        Args:
            event: 이벤트 이름

        Returns:
            List[Callable]: 등록된 리스너 목록
        """
        listeners = []

        # 일반 리스너
        if event in self._listeners:
            listeners.extend(self._listeners[event])
        if event in self._async_listeners:
            listeners.extend(self._async_listeners[event])

        # 일회성 리스너
        if event in self._once_listeners:
            listeners.extend(self._once_listeners[event])
        if event in self._async_once_listeners:
            listeners.extend(self._async_once_listeners[event])

        return listeners

    def listener_count(self, event: str) -> int:
        """
        등록된 리스너 수 반환

        Args:
            event: 이벤트 이름

        Returns:
            int: 등록된 리스너 수
        """
        return len(self.listeners(event))

    def remove_all_listeners(self, event: Optional[str] = None) -> None:
        """
        모든 리스너 제거

        Args:
            event: 이벤트 이름 (None이면 모든 이벤트의 리스너 제거)
        """
        if event is None:
            self._listeners.clear()
            self._async_listeners.clear()
            self._once_listeners.clear()
            self._async_once_listeners.clear()
        else:
            self.off(event)

    def event_names(self) -> List[str]:
        """
        등록된 모든 이벤트 이름 반환

        Returns:
            List[str]: 이벤트 이름 목록
        """
        events = set()

        for listeners in [
            self._listeners,
            self._async_listeners,
            self._once_listeners,
            self._async_once_listeners,
        ]:
            events.update(listeners.keys())

        return list(events)


# 전역 이벤트 발신자 인스턴스
event_emitter = EventEmitter()
