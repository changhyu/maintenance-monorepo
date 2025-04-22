"""
인증 API 통합 테스트.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from packages.api.src.core.security import (TOKEN_TYPE_ACCESS,
                                            TOKEN_TYPE_REFRESH,
                                            SecurityService,
                                            verify_and_decode_token)
from packages.api.src.main import app

# 테스트 클라이언트 설정
client = TestClient(app)


class TestAuthAPI:
    """인증 API 테스트 클래스"""

    def test_login_success(self):
        """로그인 성공 테스트"""
        response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "user1234"},
        )

        # 응답 검증
        assert response.status_code == 200
        data = response.json()

        # 응답 구조 검증
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["email"] == "user@example.com"

        # 토큰 유효성 검증
        access_token = data["access_token"]
        payload = verify_and_decode_token(access_token, TOKEN_TYPE_ACCESS)
        assert payload["sub"] == "user@example.com"

    def test_login_failure(self):
        """로그인 실패 테스트"""
        # 잘못된 비밀번호
        response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "wrong_password"},
        )
        assert response.status_code == 401

        # 존재하지 않는 사용자
        response = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "password"},
        )
        assert response.status_code == 401

    def test_token_refresh(self):
        """토큰 갱신 테스트"""
        # 먼저 로그인
        login_response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "user1234"},
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        refresh_token = login_data["refresh_token"]
        old_access_token = login_data["access_token"]

        # 토큰 갱신
        refresh_response = client.post(
            "/api/auth/refresh", json={"refresh_token": refresh_token}
        )

        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()

        # 새 토큰 발급 확인
        assert "access_token" in refresh_data
        assert "refresh_token" in refresh_data
        assert refresh_data["access_token"] != old_access_token

        # 새 토큰 유효성 검증
        new_access_token = refresh_data["access_token"]
        payload = verify_and_decode_token(new_access_token, TOKEN_TYPE_ACCESS)
        assert payload["sub"] == "user@example.com"

    def test_token_refresh_invalid_token(self):
        """유효하지 않은 리프레시 토큰으로 갱신 시도"""
        response = client.post(
            "/api/auth/refresh", json={"refresh_token": "invalid_token"}
        )
        assert response.status_code == 401

    def test_verify_token(self):
        """토큰 검증 테스트"""
        # 로그인
        login_response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "user1234"},
        )

        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        # 토큰으로 사용자 정보 조회
        verify_response = client.get(
            "/api/auth/verify", headers={"Authorization": f"Bearer {access_token}"}
        )

        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["valid"] is True

    def test_password_reset_request(self):
        """비밀번호 재설정 요청 테스트"""
        # 존재하는 사용자
        response = client.post(
            "/api/auth/password-reset", json={"email": "user@example.com"}
        )
        assert response.status_code == 202
        assert "message" in response.json()

        # 존재하지 않는 사용자 (보안을 위해 같은 응답 반환해야 함)
        response = client.post(
            "/api/auth/password-reset", json={"email": "nonexistent@example.com"}
        )
        assert response.status_code == 202
        assert "message" in response.json()

    def test_me_endpoint(self):
        """인증된 사용자 정보 조회 테스트"""
        # 로그인
        login_response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "user1234"},
        )

        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        # 사용자 정보 조회
        me_response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {access_token}"}
        )

        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["email"] == "user@example.com"
        assert "id" in user_data
        assert "name" in user_data
        assert "role" in user_data

    def test_me_unauthorized(self):
        """인증되지 않은 사용자의 정보 조회 시도"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

        response = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
