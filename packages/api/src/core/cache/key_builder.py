"""
캐시 키 생성 및 관리를 위한 유틸리티 클래스 모듈

이 모듈은 일관된 캐시 키 생성과 키 빌더 패턴을 구현합니다.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Set, Union
import hashlib
import json

from .constants import PROTECTED_KEY_PREFIX
from .interfaces import CacheKeyBuilderInterface


class CacheKey:
    """
    캐시 키 관리를 위한 클래스
    
    이 클래스는 캐시 키의 생성, 비교, 및 문자열 표현 기능을 제공합니다.
    """
    
    def __init__(self, key: str, prefix: Optional[str] = None):
        """
        CacheKey 인스턴스 초기화
        
        Args:
            key: 캐시 키 문자열
            prefix: 선택적 접두사
        """
        self.prefix = prefix
        self.key = key
        
    def __str__(self) -> str:
        """
        CacheKey의 문자열 표현을 반환
        
        Returns:
            캐시 키의 문자열 표현
        """
        if self.prefix:
            return f"{self.prefix}:{self.key}"
        return self.key
    
    def __eq__(self, other: object) -> bool:
        """
        CacheKey 인스턴스 간의 동등성 비교
        
        Args:
            other: 비교할 다른 객체
            
        Returns:
            동등성 여부
        """
        return isinstance(other, CacheKey) and str(self) == str(other)
    
    def __hash__(self) -> int:
        """
        CacheKey의 해시 값 반환
        
        Returns:
            해시 값
        """
        return hash(str(self))


class CacheKeyBuilder(ABC):
    """
    캐시 키 빌더 추상 기본 클래스
    
    이 추상 클래스는 캐시 키 생성을 위한 인터페이스를 정의합니다.
    """
    
    @abstractmethod
    def build(self, *args: Any, **kwargs: Any) -> str:
        """
        주어진 인자를 기반으로 캐시 키 생성
        
        Args:
            *args: 위치 인자
            **kwargs: 키워드 인자
            
        Returns:
            생성된 캐시 키 문자열
        """
        pass


class DefaultKeyBuilder(CacheKeyBuilderInterface):
    """
    기본 캐시 키 빌더 구현
    
    입력 매개변수를 기반으로 캐시 키를 생성합니다.
    """
    
    def __init__(self, namespace: str = "", separator: str = ":"):
        """
        기본 키 빌더 초기화
        
        Args:
            namespace: 키 이름공간
            separator: 키 부분 구분자
        """
        self.namespace: str = namespace
        self.separator: str = separator
        
    def build(
        self, 
        resource_type: str, 
        resource_id: Optional[str] = None, 
        action: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        캐시 키 생성
        
        Args:
            resource_type: 리소스 타입 (예: users, posts)
            resource_id: 리소스 ID (선택사항)
            action: 수행 작업 (선택사항)
            params: 추가 매개변수 (선택사항)
            
        Returns:
            생성된 캐시 키
        """
        parts = [self.namespace, resource_type]
        
        if resource_id:
            parts.append(resource_id)
            
        if action:
            parts.append(action)
            
        # 매개변수가 있는 경우 해시 생성
        if params:
            param_hash = self._hash_params(params)
            parts.append(param_hash)
            
        # 키 부분을 결합하여 최종 키 생성
        return self.separator.join(filter(None, parts))
    
    def _hash_params(self, params: Dict[str, Any]) -> str:
        """
        매개변수 해시 생성
        
        Args:
            params: 해시할 매개변수 딕셔너리
            
        Returns:
            매개변수의 해시 문자열
        """
        # 매개변수 정렬하여 일관성 있는 해시 생성
        sorted_params = json.dumps(params, sort_keys=True)
        return hashlib.md5(sorted_params.encode()).hexdigest()
    
    def parse(self, key: str) -> Dict[str, str]:
        """
        캐시 키 파싱
        
        Args:
            key: 파싱할 캐시 키
            
        Returns:
            파싱된 키 컴포넌트
        """
        parts = key.split(self.separator)
        result: Dict[str, str] = {}
        
        # 이름공간이 있는 경우
        if parts[0] == self.namespace and len(parts) > 1:
            parts = parts[1:]
        
        if len(parts) >= 1:
            result["resource_type"] = parts[0]
            
        if len(parts) >= 2:
            # 두 번째 부분이 해시가 아닌 경우 리소스 ID로 간주
            if not self._is_hash(parts[1]) and len(parts[1]) < 32:
                result["resource_id"] = parts[1]
            
        if len(parts) >= 3:
            # 세 번째 부분이 해시가 아닌 경우 작업으로 간주
            if not self._is_hash(parts[2]) and len(parts[2]) < 32:
                result["action"] = parts[2]
                
        return result
    
    def _is_hash(self, s: str) -> bool:
        """
        문자열이 해시인지 확인
        
        Args:
            s: 확인할 문자열
            
        Returns:
            해시 여부
        """
        # 16진수 문자만 포함되고 길이가 32인지 확인 (MD5 해시)
        return all(c in "0123456789abcdef" for c in s.lower()) and len(s) == 32
    
    def get_pattern_for_resource(self, resource_type: str, resource_id: Optional[str] = None) -> str:
        """
        특정 리소스 유형이나 ID에 대한 패턴 생성
        
        Args:
            resource_type: 리소스 타입
            resource_id: 리소스 ID (선택사항)
            
        Returns:
            캐시 키 패턴
        """
        parts = [self.namespace, resource_type]
        
        if resource_id:
            parts.append(resource_id)
            parts.append("*")
        else:
            parts.append("*")
            
        return self.separator.join(filter(None, parts))


class CompositeKeyBuilder(CacheKeyBuilderInterface):
    """
    복합 키 빌더
    
    여러 키 빌더를 함께 사용할 수 있게 합니다.
    """
    
    def __init__(self, builders: List[CacheKeyBuilderInterface]):
        """
        복합 키 빌더 초기화
        
        Args:
            builders: 키 빌더 목록
        """
        self.builders = builders
        
    def build(
        self, 
        resource_type: str, 
        resource_id: Optional[str] = None, 
        action: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        첫 번째 빌더를 사용하여 키 생성
        
        Args:
            resource_type: 리소스 타입
            resource_id: 리소스 ID (선택사항)
            action: 수행 작업 (선택사항)
            params: 추가 매개변수 (선택사항)
            
        Returns:
            생성된 캐시 키
        """
        if not self.builders:
            raise ValueError("키 빌더가 없습니다")
            
        # 첫 번째 빌더를 사용하여 키 생성
        return self.builders[0].build(resource_type, resource_id, action, params)
    
    def parse(self, key: str) -> Dict[str, str]:
        """
        모든 빌더를 시도하여 키 파싱
        
        Args:
            key: 파싱할 캐시 키
            
        Returns:
            파싱된 키 컴포넌트
        """
        for builder in self.builders:
            try:
                result = builder.parse(key)
                if result:
                    return result
            except Exception:
                continue
                
        return {}
    
    def get_pattern_for_resource(self, resource_type: str, resource_id: Optional[str] = None) -> str:
        """
        첫 번째 빌더를 사용하여 패턴 생성
        
        Args:
            resource_type: 리소스 타입
            resource_id: 리소스 ID (선택사항)
            
        Returns:
            캐시 키 패턴
        """
        if not self.builders:
            raise ValueError("키 빌더가 없습니다")
            
        return self.builders[0].get_pattern_for_resource(resource_type, resource_id)


class ResourceKeyBuilder(CacheKeyBuilder):
    """
    리소스 기반 캐시 키 빌더.
    
    리소스 유형과 ID를 기반으로 캐시 키를 생성합니다.
    """
    
    def __init__(self, separator: str = ":"):
        """
        ResourceKeyBuilder 초기화.
        
        인자:
            separator: 키 부분을 연결하는 데 사용할 구분자
        """
        self.separator: str = separator
    
    def build(self, resource_type: str, resource_id: str, section: Optional[str] = None, **kwargs) -> str:
        """
        리소스 정보를 기반으로 캐시 키를 생성합니다.
        
        인자:
            resource_type: 리소스 유형 (예: 'user', 'post')
            resource_id: 리소스 ID
            section: 캐시 섹션 (예: 'metadata', 'list')
            **kwargs: 추가 키워드 인자
            
        반환값:
            str: 생성된 캐시 키
        """
        if section and section in CACHE_SECTIONS:
            # 섹션 패턴이 제공된 경우
            pattern = CACHE_SECTIONS[section]
            key = pattern.format(resource_type=resource_type, resource_id=resource_id, **kwargs)
        elif resource_type in RESOURCE_KEY_PATTERNS:
            # 리소스 패턴이 있는 경우
            pattern = RESOURCE_KEY_PATTERNS[resource_type]
            key = pattern.format(id=resource_id, **kwargs)
        else:
            # 기본 패턴
            key = f"{resource_type}{self.separator}{resource_id}"
            
            # 추가 인자가 있으면 포함
            if kwargs:
                kwargs_str = self._process_kwargs(kwargs)
                key = f"{key}{self.separator}{kwargs_str}"
        
        return key
    
    def _process_kwargs(self, kwargs: Dict[str, Any]) -> str:
        """키워드 인자를 문자열로 변환합니다."""
        if not kwargs:
            return ""
        
        sorted_items = sorted(kwargs.items())
        parts = []
        
        for k, v in sorted_items:
            if isinstance(v, (str, int, float, bool)):
                parts.append(f"{k}={v}")
            else:
                # 복잡한 객체는 해시로 변환
                v_hash = hashlib.md5(json.dumps(v, sort_keys=True, default=str).encode()).hexdigest()[:8]
                parts.append(f"{k}={v_hash}")
        
        return self.separator.join(parts) 