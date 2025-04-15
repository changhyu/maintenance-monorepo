"""
캐시 관련 예외 클래스

이 모듈은 캐시 시스템에서 발생할 수 있는 모든 예외를 정의합니다.
"""

class CacheException(Exception):
    """캐시 작업 중 발생하는 기본 예외 클래스"""
    pass


class CacheKeyError(CacheException):
    """캐시 키 관련 오류"""
    pass


class RedisConnectionError(CacheException):
    """Redis 연결 실패 예외"""
    pass 