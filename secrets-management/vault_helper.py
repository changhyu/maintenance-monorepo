"""
Python용 Vault 헬퍼 모듈

이 모듈은 애플리케이션에서 Vault에 저장된 시크릿에 쉽게 접근할 수 있도록 도와줍니다.

사용 방법:
1. hvac 패키지 설치: pip install hvac
2. 환경 변수 설정: VAULT_ADDR, VAULT_TOKEN
3. 이 모듈을 프로젝트에 포함시키고 시크릿에 접근
"""

import os
import time
from typing import Dict, List, Any, Optional, Union
import hvac

class VaultHelper:
    """HashiCorp Vault 시크릿 관리를 위한 헬퍼 클래스"""
    
    def __init__(self, url: str = None, token: str = None, 
                 mount_point: str = 'kv', default_ttl: int = 300):
        """
        Vault 클라이언트 초기화
        
        Args:
            url: Vault 서버 URL (기본값: 환경 변수 VAULT_ADDR 또는 'http://localhost:8200')
            token: Vault 인증 토큰 (기본값: 환경 변수 VAULT_TOKEN)
            mount_point: 시크릿 엔진 마운트 포인트 (기본값: 'kv')
            default_ttl: 기본 캐시 유효 시간(초) (기본값: 300초)
        """
        self.url = url or os.environ.get('VAULT_ADDR', 'http://localhost:8200')
        self.token = token or os.environ.get('VAULT_TOKEN')
        self.mount_point = mount_point
        self.default_ttl = default_ttl
        
        # Vault 클라이언트 초기화
        self.client = hvac.Client(url=self.url, token=self.token)
        
        # 시크릿 캐시
        self._secret_cache = {}

    def get_secret(self, path: str, field: str = None) -> Union[str, Dict[str, Any]]:
        """
        Vault에서 시크릿을 조회합니다.
        
        Args:
            path: 시크릿 경로 (예: 'api/keys')
            field: 특정 필드만 조회할 경우 (기본값: None - 전체 조회)
            
        Returns:
            특정 필드 값 또는 전체 시크릿 데이터
            
        Raises:
            Exception: Vault 접근 오류 또는 데이터 누락 시
        """
        try:
            # Vault 클라이언트 상태 확인
            if not self.client.is_authenticated():
                raise Exception("Vault 클라이언트가 인증되지 않았습니다.")
                
            secret = self.client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point=self.mount_point
            )
            
            if not secret or 'data' not in secret or 'data' not in secret['data']:
                raise Exception(f"시크릿 데이터가 '{path}'에 존재하지 않습니다.")
            
            # 특정 필드만 요청한 경우
            if field and field in secret['data']['data']:
                return secret['data']['data'][field]
            
            # 전체 데이터 반환
            return secret['data']['data']
            
        except Exception as e:
            print(f"Error fetching secret from {self.mount_point}/{path}: {str(e)}")
            raise

    def set_secret(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Vault에 시크릿을 저장합니다.
        
        Args:
            path: 시크릿 경로 (예: 'api/keys')
            data: 저장할 데이터 객체
            
        Returns:
            저장 결과
            
        Raises:
            Exception: Vault 접근 오류 시
        """
        try:
            return self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=data,
                mount_point=self.mount_point
            )
        except Exception as e:
            print(f"Error storing secret at {self.mount_point}/{path}: {str(e)}")
            raise

    def delete_secret(self, path: str) -> Dict[str, Any]:
        """
        Vault에서 시크릿을 삭제합니다.
        
        Args:
            path: 시크릿 경로 (예: 'api/keys')
            
        Returns:
            삭제 결과
            
        Raises:
            Exception: Vault 접근 오류 시
        """
        try:
            return self.client.secrets.kv.v2.delete_metadata_and_all_versions(
                path=path,
                mount_point=self.mount_point
            )
        except Exception as e:
            print(f"Error deleting secret from {self.mount_point}/{path}: {str(e)}")
            raise

    def list_secrets(self, path: str = '') -> List[str]:
        """
        특정 경로의 모든 시크릿 키를 나열합니다.
        
        Args:
            path: 시크릿 경로 (예: 'api')
            
        Returns:
            시크릿 키 목록
            
        Raises:
            Exception: Vault 접근 오류 시
        """
        try:
            result = self.client.secrets.kv.v2.list_secrets(
                path=path,
                mount_point=self.mount_point
            )
            return result.get('data', {}).get('keys', [])
        except Exception as e:
            print(f"Error listing secrets at {self.mount_point}/{path}: {str(e)}")
            raise

    def get_cached_secret(self, path: str, field: str = None, ttl: int = None) -> Union[str, Dict[str, Any]]:
        """
        시크릿을 캐싱과 함께 조회합니다.
        
        Args:
            path: 시크릿 경로
            field: 특정 필드 (기본값: None)
            ttl: 캐시 유효 시간(초) (기본값: self.default_ttl)
            
        Returns:
            시크릿 값
        """
        cache_key = f"{path}:{field if field else 'all'}"
        ttl = ttl or self.default_ttl
        current_time = time.time()
        
        # 캐시에 있고 만료되지 않은 경우
        if cache_key in self._secret_cache:
            cached = self._secret_cache[cache_key]
            if cached['expiry'] > current_time:
                return cached['value']
            # 만료된 경우 캐시에서 제거
            del self._secret_cache[cache_key]
        
        # 새로운 값 조회
        value = self.get_secret(path, field)
        
        # 캐시에 저장
        self._secret_cache[cache_key] = {
            'value': value,
            'expiry': current_time + ttl
        }
        
        return value

    def is_healthy(self) -> bool:
        """
        Vault 서버 상태 확인
        
        Returns:
            정상 작동 여부 (True/False)
        """
        try:
            return self.client.sys.read_health_status()['initialized']
        except:
            return False

# 싱글톤 인스턴스 생성
vault_helper = VaultHelper()

# 편의를 위한 함수들
def get_secret(path, field=None):
    """vault_helper.get_secret의 래퍼 함수"""
    return vault_helper.get_secret(path, field)

def set_secret(path, data):
    """vault_helper.set_secret의 래퍼 함수"""
    return vault_helper.set_secret(path, data)

def get_cached_secret(path, field=None, ttl=None):
    """vault_helper.get_cached_secret의 래퍼 함수"""
    return vault_helper.get_cached_secret(path, field, ttl)
