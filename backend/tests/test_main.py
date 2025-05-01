from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
from datetime import datetime, timedelta
from backend.main import app
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User
from backend.core.auth import create_access_token

client = TestClient(app)

@pytest.fixture
def test_user(db: Session):
    user = User(
        email="test@example.com",
        hashed_password="hashed_password",
        is_active=True,
        is_superuser=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_token(test_user):
    return create_access_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(minutes=15)
    )

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data

def test_api_info():
    response = client.get("/api/v1")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "통합 관리 API"
    assert data["version"] == "1.0.0"
    assert "git_path" in data
    assert "environment" in data

def test_protected_endpoint_without_token():
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "인증이 필요합니다"

def test_protected_endpoint_with_token(test_token):
    headers = {"Authorization": f"Bearer {test_token}"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200

def test_invalid_token():
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "인증이 필요합니다"

def test_api_version_info():
    response = client.get("/api/versions/v1")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "info" in data
    assert "supported" in data

def test_nonexistent_api_version():
    response = client.get("/api/versions/nonexistent")
    assert response.status_code == 404
    assert response.json()["detail"] == "API 버전 nonexistent을(를) 찾을 수 없습니다."

def test_swagger_ui():
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_redoc():
    response = client.get("/redoc")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"] 