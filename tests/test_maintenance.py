import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from unittest.mock import patch

from packages.api.src.routers import maintenance

app = FastAPI()
app.include_router(maintenance.router)

client = TestClient(app)

def test_get_maintenance_status(mock_maintenance_controller):
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "path" in data
    assert "git_status" in data


def test_post_maintenance_commit(mock_maintenance_controller):
    response = client.post("/commit", json={"message": "Test commit"})
    assert response.status_code == 200
    data = response.json()
    assert "result" in data


def test_get_vehicle_maintenance(mock_maintenance_controller):
    vehicle_id = "ABC123"
    response = client.get(f"/vehicle/{vehicle_id}")
    assert response.status_code == 200
    data = response.json()
    assert "vehicle_id" in data


def test_schedule_maintenance(mock_maintenance_controller):
    response = client.post("/scheduled", json={
        "vehicle_id": "ABC123",
        "schedule_date": "2025-01-01",
        "maintenance_type": "oil_change",
        "description": "테스트 정비"
    })
    assert response.status_code == 200
    data = response.json()
    assert "scheduled" in data


def test_complete_maintenance(mock_maintenance_controller):
    maintenance_id = "maint1"
    response = client.post(f"/complete/{maintenance_id}")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data or "error" in data


def test_maintenance_recommendations(mock_maintenance_controller):
    vehicle_id = "ABC123"
    response = client.get(f"/recommendations/{vehicle_id}")
    assert response.status_code == 200
    data = response.json()
    assert "vehicle_id" in data
    assert "recommendations" in data


def test_maintenance_statistics(mock_maintenance_controller):
    vehicle_id = "ABC123"
    response = client.get(f"/statistics/{vehicle_id}")
    assert response.status_code == 200
    data = response.json()
    assert "vehicle_id" in data 