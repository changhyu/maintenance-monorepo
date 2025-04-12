from fastapi.testclient import TestClient
from fastapi import FastAPI

from packages.api.src.routers import maintenance

app = FastAPI()
app.include_router(maintenance.router)

client = TestClient(app)

def test_get_maintenance_status():
    response = client.get("/maintenance")
    assert response.status_code == 200
    data = response.json()
    assert "repo_status" in data
    assert "current_branch" in data


def test_post_maintenance_commit():
    response = client.post("/maintenance", json={"message": "Test commit"})
    assert response.status_code == 200
    data = response.json()
    assert "result" in data


def test_get_vehicle_maintenance():
    vehicle_id = "ABC123"
    response = client.get(f"/vehicle/{vehicle_id}")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_schedule_maintenance():
    response = client.post("/scheduled")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_complete_maintenance():
    maintenance_id = "maint1"
    response = client.post(f"/complete/{maintenance_id}")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_maintenance_recommendations():
    vehicle_id = "ABC123"
    response = client.get(f"/recommendations/{vehicle_id}")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_maintenance_statistics():
    vehicle_id = "ABC123"
    response = client.get(f"/statistics/{vehicle_id}")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data 