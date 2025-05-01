"""
속도 제한(Rate Limiting) 기능 테스트
"""

import time
import unittest
from unittest.mock import Mock, patch, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request
from starlette.responses import JSONResponse

from gitmanager.security.rate_limit import RateLimiter, RateLimitMiddleware
from gitmanager.security.rate_limit.storage import InMemoryStorage

class TestRateLimiter:
    """RateLimiter 클래스 단위 테스트"""
    
    def setup_method(self):
        """테스트 전 설정"""
        self.storage = InMemoryStorage()
        self.limiter = RateLimiter(
            storage=self.storage,
            default_limit=5,
            default_window=60
        )
        
    def test_init(self):
        """초기화 테스트"""
        assert self.limiter.default_limit == 5
        assert self.limiter.default_window == 60
        assert self.limiter.admin_limit_multiplier == 5.0
        
    def test_get_limit_for_endpoint(self):
        """엔드포인트별 제한 테스트"""
        # 일반 사용자 테스트
        assert self.limiter.get_limit_for_endpoint("git_status") == 60
        assert self.limiter.get_limit_for_endpoint("git_commit") == 10
        assert self.limiter.get_limit_for_endpoint("unknown") == 5  # 기본값
        
        # 관리자 테스트
        assert self.limiter.get_limit_for_endpoint("git_status", is_admin=True) == 300  # 60 * 5
        assert self.limiter.get_limit_for_endpoint("git_commit", is_admin=True) == 50   # 10 * 5
        
    def test_check_rate_limit(self):
        """속도 제한 확인 테스트"""
        # 첫 요청은 항상 성공
        allowed, info = self.limiter.check_rate_limit("test_user", "default")
        assert allowed is True
        assert info["limit"] == 5
        assert info["remaining"] == 4
        
        # 제한까지 요청 보내기
        for i in range(4):
            allowed, info = self.limiter.check_rate_limit("test_user", "default")
            assert allowed is True
            assert info["remaining"] == 3 - i
            
        # 제한 초과 요청
        allowed, info = self.limiter.check_rate_limit("test_user", "default")
        assert allowed is False
        assert info["remaining"] == 0
        
    def test_reset_counter(self):
        """카운터 초기화 테스트"""
        # 몇 개의 요청 보내기
        for i in range(3):
            self.limiter.check_rate_limit("test_user", "default")
            
        # 카운터 상태 확인
        _, info = self.limiter.check_rate_limit("test_user", "default")
        assert info["remaining"] == 1
        
        # 카운터 초기화
        self.limiter.reset_counter("test_user", "default")
        
        # 초기화 후 상태 확인
        _, info = self.limiter.check_rate_limit("test_user", "default")
        assert info["remaining"] == 4  # 한 번 사용하고 남은 수
        
    def test_admin_higher_limits(self):
        """관리자 높은 제한 테스트"""
        # 일반 사용자
        allowed, _ = self.limiter.check_rate_limit("user1", "git_commit")
        assert allowed is True
        
        # 10번째 요청에서 제한 도달
        for i in range(9):
            self.limiter.check_rate_limit("user1", "git_commit")
            
        allowed, _ = self.limiter.check_rate_limit("user1", "git_commit")
        assert allowed is False
        
        # 관리자는 더 많은 요청 가능
        allowed, _ = self.limiter.check_rate_limit("admin1", "git_commit", is_admin=True)
        assert allowed is True
        
        # 49번의 추가 요청
        for i in range(49):
            self.limiter.check_rate_limit("admin1", "git_commit", is_admin=True)
        
        # 50번째 요청에서 제한 도달
        allowed, _ = self.limiter.check_rate_limit("admin1", "git_commit", is_admin=True)
        assert allowed is False
        
class TestRateLimitMiddleware:
    """RateLimitMiddleware 테스트"""
    
    def setup_method(self):
        """테스트 전 설정"""
        self.app = FastAPI()
        self.storage = InMemoryStorage()
        self.rate_limiter = RateLimiter(
            storage=self.storage,
            default_limit=5,
            default_window=60
        )
        
        # 테스트 라우트 추가
        @self.app.get("/api/test")
        def test_route():
            return {"message": "success"}
            
        @self.app.get("/api/admin/git/status")
        def git_status():
            return {"status": "ok"}
            
        # 미들웨어 추가
        self.app.add_middleware(
            RateLimitMiddleware,
            rate_limiter=self.rate_limiter,
            excluded_paths=["/api/excluded"],
            admin_paths=["/api/admin"]
        )
        
        self.client = TestClient(self.app)
        
    def test_normal_request(self):
        """일반 요청 테스트"""
        # 제한 내의 요청
        for i in range(5):
            response = self.client.get("/api/test")
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers
            assert "X-RateLimit-Reset" in response.headers
            
        # 제한 초과 요청
        response = self.client.get("/api/test")
        assert response.status_code == 429
        assert response.json()["success"] is False
        assert "요청 횟수가 너무 많습니다" in response.json()["message"]
        
    def test_excluded_path(self):
        """제외 경로 테스트"""
        # 제외된 경로는 제한 없음
        for i in range(10):  # 제한 초과해도 성공
            response = self.client.get("/api/excluded")
            assert response.status_code == 404  # 라우트가 없으므로 404
            
    def test_different_endpoints(self):
        """서로 다른 엔드포인트 테스트"""
        # git_status 엔드포인트는 60번까지 가능
        for i in range(10):  # 일부만 테스트
            response = self.client.get("/api/admin/git/status")
            assert response.status_code == 200
            
        # 다른 엔드포인트는 독립적으로 제한
        for i in range(5):
            response = self.client.get("/api/test")
            assert response.status_code == 200
            
        # test 엔드포인트만 제한 초과
        response = self.client.get("/api/test")
        assert response.status_code == 429
        
        # git_status 엔드포인트는 여전히 가능
        response = self.client.get("/api/admin/git/status")
        assert response.status_code == 200 